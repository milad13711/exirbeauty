import { Prisma, type LoyaltyTxKind } from "@prisma/client";
import { prisma } from "../../db";
import { conflict, notFound } from "../../http/errors";
import { DEFAULT_CONFIG, cashbackFor, earnFor, nextGoal, settleTier, tierFor, tierOff, type Config } from "./rules";

// Every query is scoped by tenantId. Points and wallet change only through apply(), under a row lock, with a ledger row each time.

type Tx = Prisma.TransactionClient;

// ───────── config ─────────

export async function getConfig(tenantId: string): Promise<Config> {
  const r = await prisma.loyaltyConfig.findUnique({ where: { tenantId } });
  return r ? { tiers: r.tiers as Config["tiers"], earn: r.earn as Config["earn"], rewards: r.rewards as Config["rewards"], cashback: r.cashback as Config["cashback"] } : DEFAULT_CONFIG;
}
export async function putConfig(tenantId: string, c: Config) {
  const data = { tiers: c.tiers, earn: c.earn, rewards: c.rewards, cashback: c.cashback };
  await prisma.loyaltyConfig.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
  return getConfig(tenantId);
}

// ───────── the ledger primitive ─────────

type Apply = { tenantId: string; customerId: string; kind: LoyaltyTxKind; points?: number; wallet?: number; earned?: boolean; ref?: string | null; note?: string; clamp?: boolean };

/**
 * Locks the customer's account row, applies the change, settles the tier and writes the ledger row.
 * Without `clamp` a change that would take points or wallet below zero throws 409; with it the balance stops at zero
 * (used when reversing an invoice whose points were already spent). `earned` also adds positive points to lifetime.
 */
async function apply(tx: Tx, cfg: Config, a: Apply) {
  await tx.$executeRaw`INSERT INTO "LoyaltyAccount" ("tenantId","customerId","tier","updatedAt") VALUES (${a.tenantId}, ${a.customerId}, ${tierFor(cfg.tiers, 0).name}, now()) ON CONFLICT DO NOTHING`;
  const [acc] = await tx.$queryRaw<{ points: number; lifetime: number; wallet: number; tier: string }[]>`SELECT "points","lifetime","wallet","tier" FROM "LoyaltyAccount" WHERE "tenantId" = ${a.tenantId} AND "customerId" = ${a.customerId} FOR UPDATE`;
  const dp = a.points ?? 0, dw = a.wallet ?? 0;
  let points = acc.points + dp, wallet = acc.wallet + dw;
  if ((points < 0 || wallet < 0) && !a.clamp) throw conflict(points < 0 ? "امتیاز کافی نیست" : "اعتبار کیف پول کافی نیست", points < 0 ? "NOT_ENOUGH_POINTS" : "NOT_ENOUGH_WALLET");
  points = Math.max(0, points); wallet = Math.max(0, wallet);
  const lifetime = Math.max(0, acc.lifetime + (a.earned ? dp : 0));
  const tier = settleTier(cfg.tiers, lifetime, acc.tier || tierFor(cfg.tiers, 0).name);
  await tx.loyaltyAccount.update({ where: { tenantId_customerId: { tenantId: a.tenantId, customerId: a.customerId } }, data: { points, wallet, lifetime, tier } });
  await tx.loyaltyTx.create({ data: { tenantId: a.tenantId, customerId: a.customerId, kind: a.kind, points: points - acc.points, wallet: wallet - acc.wallet, pointsAfter: points, walletAfter: wallet, ref: a.ref ?? null, note: a.note ?? "" } });
  return { points, wallet, lifetime, tier };
}

const isDup = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
/** Runs an idempotent ledger step; a replay (unique index) is a no-op. */
async function once(fn: () => Promise<unknown>) { try { await fn(); } catch (e) { if (!isDup(e)) throw e; } }

async function ownCustomer(tenantId: string, id: string) {
  const c = await prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true, name: true, phone: true } });
  if (!c) throw notFound("مشتری پیدا نشد");
  return c;
}

// ───────── wallet as a payment method (called by the cashier inside its own transaction) ─────────

export async function spendWallet(tx: Tx, tenantId: string, customerId: string, amount: number, saleId: string, code: string) {
  const cfg = await getConfig(tenantId);
  return apply(tx, cfg, { tenantId, customerId, kind: "WALLET_SPEND", wallet: -amount, ref: saleId, note: `فاکتور ${code}` });
}
export async function refundWallet(tx: Tx, tenantId: string, customerId: string, amount: number, saleId: string, code: string) {
  const cfg = await getConfig(tenantId);
  return apply(tx, cfg, { tenantId, customerId, kind: "WALLET_REFUND", wallet: amount, ref: saleId, note: `ابطال فاکتور ${code}` });
}

/** Points from another module (e.g. a referral bonus), counted toward the tier like any earned points. */
export async function grantPoints(tx: Tx, tenantId: string, customerId: string, points: number, note: string) {
  return apply(tx, await getConfig(tenantId), { tenantId, customerId, kind: "REFERRAL", points, earned: true, note });
}

// ───────── reactions to cashier events ─────────

export async function onSaleCreated(tenantId: string, p: Record<string, unknown>) {
  const sale = await prisma.sale.findFirst({ where: { id: String(p.id), tenantId }, include: { lines: true, payments: true } });
  if (!sale || !sale.customerId || sale.status === "VOID") return;
  const cfg = await getConfig(tenantId);
  const customerId = sale.customerId;
  const pts = earnFor(cfg.earn, sale.lines, sale.discountPct);
  if (pts > 0) await once(() => prisma.$transaction((tx) => apply(tx, cfg, { tenantId, customerId, kind: "EARN", points: pts, earned: true, ref: sale.id, note: `فاکتور F-${sale.number}` })));
  const walletUsed = sale.payments.filter((x) => x.method === "WALLET").reduce((a, x) => a + x.amount, 0);
  const cb = cashbackFor(cfg.cashback, sale.paid - walletUsed);
  if (cb > 0) await once(() => prisma.$transaction((tx) => apply(tx, cfg, { tenantId, customerId, kind: "CASHBACK", wallet: cb, ref: sale.id, note: `بازگشت وجه فاکتور F-${sale.number}` })));
}

export async function onSaleVoided(tenantId: string, p: Record<string, unknown>) {
  const saleId = String(p.id);
  const earned = await prisma.loyaltyTx.findMany({ where: { tenantId, ref: saleId, kind: { in: ["EARN", "CASHBACK"] } } });
  if (!earned.length) return;
  const cfg = await getConfig(tenantId);
  for (const e of earned) {
    const kind = e.kind === "EARN" ? "EARN_REVERSE" : "CASHBACK_REVERSE";
    await once(() => prisma.$transaction((tx) => apply(tx, cfg, { tenantId, customerId: e.customerId, kind, points: -e.points, wallet: -e.wallet, earned: true, ref: saleId, note: "ابطال فاکتور", clamp: true })));
  }
}

// ───────── customer view & actions ─────────

export async function customerState(tenantId: string, customerId: string) {
  const c = await ownCustomer(tenantId, customerId);
  const cfg = await getConfig(tenantId);
  const acc = await prisma.loyaltyAccount.findUnique({ where: { tenantId_customerId: { tenantId, customerId } } });
  const points = acc?.points ?? 0, lifetime = acc?.lifetime ?? 0;
  const tier = settleTier(cfg.tiers, lifetime, acc?.tier || tierFor(cfg.tiers, 0).name);
  const log = await prisma.loyaltyTx.findMany({ where: { tenantId, customerId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, kind: true, points: true, wallet: true, note: true, createdAt: true } });
  return { customerId, name: c.name, points, lifetime, wallet: acc?.wallet ?? 0, tier, off: tierOff(cfg.tiers, tier), next: nextGoal(cfg, lifetime, points), log };
}

export async function redeem(tenantId: string, customerId: string, rewardId: string) {
  await ownCustomer(tenantId, customerId);
  const cfg = await getConfig(tenantId);
  const r = cfg.rewards.find((x) => x.id === rewardId);
  if (!r) throw notFound("جایزه پیدا نشد");
  await prisma.$transaction(async (tx) => {
    await apply(tx, cfg, { tenantId, customerId, kind: "REDEEM", points: -r.cost, ref: r.id, note: r.name });
    if (r.kind === "wallet") await apply(tx, cfg, { tenantId, customerId, kind: "REWARD_CREDIT", wallet: r.value, ref: r.id, note: r.name });
  });
  // wallet rewards are credited right away; "free"/"product" rewards are a voucher the cashier honours at the till
  return { reward: r, state: await customerState(tenantId, customerId) };
}

export async function adjust(tenantId: string, customerId: string, b: { points: number; wallet: number; note: string }) {
  await ownCustomer(tenantId, customerId);
  const cfg = await getConfig(tenantId);
  await prisma.$transaction(async (tx) => {
    if (b.points) await apply(tx, cfg, { tenantId, customerId, kind: "ADJUST", points: b.points, earned: b.points > 0, note: b.note });
    if (b.wallet) await apply(tx, cfg, { tenantId, customerId, kind: "WALLET_ADJUST", wallet: b.wallet, note: b.note });
  });
  return customerState(tenantId, customerId);
}

// ───────── club overview ─────────

export async function overview(tenantId: string) {
  const [agg, tiers, top] = await Promise.all([
    prisma.loyaltyAccount.aggregate({ where: { tenantId }, _count: true, _sum: { points: true, wallet: true } }),
    prisma.loyaltyAccount.groupBy({ by: ["tier"], where: { tenantId }, _count: true }),
    prisma.loyaltyAccount.findMany({ where: { tenantId }, orderBy: { lifetime: "desc" }, take: 10, include: { customer: { select: { name: true } } } }),
  ]);
  return {
    members: agg._count, points: agg._sum.points ?? 0, walletTotal: agg._sum.wallet ?? 0,
    tiers: Object.fromEntries(tiers.map((t) => [t.tier, t._count])),
    top: top.map((a) => ({ customerId: a.customerId, name: a.customer.name, tier: a.tier, points: a.points, lifetime: a.lifetime, wallet: a.wallet })),
  };
}

export async function members(tenantId: string, q: { sort: "points" | "wallet" | "lifetime"; limit: number }) {
  const rows = await prisma.loyaltyAccount.findMany({ where: { tenantId }, orderBy: { [q.sort]: "desc" }, take: q.limit, include: { customer: { select: { name: true, phone: true } } } });
  return rows.map((a) => ({ customerId: a.customerId, name: a.customer.name, phone: a.customer.phone, tier: a.tier, points: a.points, lifetime: a.lifetime, wallet: a.wallet }));
}

