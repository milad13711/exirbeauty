import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { notFound } from "../../http/errors";
import { grantPoints } from "../loyalty/service";
import { canAttach, newCode, normalizeCode, shouldReward } from "./rules";

// Every query is scoped by tenantId. The loyalty ledger does the actual crediting.

export async function getConfig(tenantId: string) {
  const c = await prisma.referralConfig.findUnique({ where: { tenantId } });
  return { enabled: c?.enabled ?? false, referrerPts: c?.referrerPts ?? 100, friendOff: c?.friendOff ?? 10 };
}
export async function putConfig(tenantId: string, c: { enabled: boolean; referrerPts: number; friendOff: number }) {
  await prisma.referralConfig.upsert({ where: { tenantId }, create: { tenantId, ...c }, update: c });
  return getConfig(tenantId);
}

async function ownCustomer(tenantId: string, id: string) {
  const c = await prisma.customer.findFirst({ where: { id, tenantId }, select: { id: true, name: true, referredById: true } });
  if (!c) throw notFound("مشتری پیدا نشد");
  return c;
}

/** Each customer's own invite code, created on first use. */
export async function codeFor(tenantId: string, customerId: string) {
  const existing = await prisma.referralLink.findUnique({ where: { tenantId_customerId: { tenantId, customerId } } });
  if (existing) return existing.code;
  for (let i = 0; i < 8; i++) {
    try { return (await prisma.referralLink.create({ data: { tenantId, customerId, code: newCode() } })).code; }
    catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      const again = await prisma.referralLink.findUnique({ where: { tenantId_customerId: { tenantId, customerId } } }); // lost a race for the same customer
      if (again) return again.code;
    }
  }
  throw new Error("could not allocate a referral code");
}

export async function customerState(tenantId: string, customerId: string) {
  const c = await ownCustomer(tenantId, customerId);
  const cfg = await getConfig(tenantId);
  const [code, friends, rewards, referrer, rewarded] = await Promise.all([
    codeFor(tenantId, customerId),
    prisma.customer.count({ where: { tenantId, referredById: customerId } }),
    prisma.referralReward.aggregate({ where: { tenantId, referrerId: customerId }, _count: true, _sum: { points: true } }),
    c.referredById ? prisma.customer.findFirst({ where: { id: c.referredById, tenantId }, select: { id: true, name: true } }) : null,
    prisma.referralReward.count({ where: { tenantId, friendId: customerId } }),
  ]);
  return {
    customerId, code, path: `/s/{slug}?ref=${code}`, enabled: cfg.enabled,
    friends, rewardedFriends: rewards._count, pointsEarned: rewards._sum.points ?? 0,
    referredBy: referrer,
    // The discount the cashier should offer on this customer's first invoice.
    friendOffer: cfg.enabled && referrer && !rewarded ? cfg.friendOff : 0,
  };
}

// ───────── attaching a friend (reaction to the public booking's invite code) ─────────

export async function onReferralCode(tenantId: string, p: Record<string, unknown>) {
  const cfg = await getConfig(tenantId);
  if (!cfg.enabled) return;
  const customerId = String(p.customerId), code = normalizeCode(String(p.code ?? ""));
  if (!code) return;
  const link = await prisma.referralLink.findUnique({ where: { code } });
  if (!link || link.tenantId !== tenantId) return;
  const c = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, referredById: true } });
  if (!c) return;
  const prior = await prisma.sale.count({ where: { tenantId, customerId, status: { not: "VOID" } } });
  if (!canAttach({ customerId, referrerId: link.customerId, alreadyReferredBy: c.referredById, hasPriorSale: prior > 0 })) return;
  // Only attaches while still unreferred (a double submit or a race can't re-point it).
  await prisma.customer.updateMany({ where: { id: customerId, tenantId, referredById: null }, data: { referredById: link.customerId } });
}

// ───────── rewarding the referrer (reaction to the friend's invoice) ─────────

export async function onSaleCreated(tenantId: string, p: Record<string, unknown>) {
  const sale = await prisma.sale.findFirst({ where: { id: String(p.id), tenantId }, select: { id: true, number: true, total: true, status: true, customerId: true, customer: { select: { referredById: true } } } });
  if (!sale || sale.status === "VOID" || !sale.customerId || !sale.customer?.referredById) return;
  const cfg = await getConfig(tenantId);
  const friendId = sale.customerId, referrerId = sale.customer.referredById;
  const rewarded = (await prisma.referralReward.count({ where: { tenantId, friendId } })) > 0;
  if (!shouldReward({ enabled: cfg.enabled, referred: true, alreadyRewarded: rewarded, saleTotal: sale.total })) return;
  try {
    await prisma.$transaction(async (tx) => {
      // The unique (tenant, friend) row and the points land together or not at all.
      await tx.referralReward.create({ data: { tenantId, referrerId, friendId, saleId: sale.id, points: cfg.referrerPts } });
      if (cfg.referrerPts > 0) await grantPoints(tx, tenantId, referrerId, cfg.referrerPts, `معرفی دوست — فاکتور F-${sale.number}`);
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
}

// ───────── owner overview ─────────

export async function overview(tenantId: string) {
  const referred = await prisma.customer.findMany({ where: { tenantId, referredById: { not: null } }, select: { id: true, name: true, referredById: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 });
  const rewards = await prisma.referralReward.findMany({ where: { tenantId, friendId: { in: referred.map((r) => r.id) } }, select: { friendId: true, points: true } });
  const done = new Map(rewards.map((r) => [r.friendId, r.points]));
  const names = new Map((await prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set(referred.map((r) => r.referredById!))] } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]));
  const rows = referred.map((r) => ({ friendId: r.id, friend: r.name, referrerId: r.referredById!, referrer: names.get(r.referredById!) ?? "—", rewarded: done.has(r.id), points: done.get(r.id) ?? 0, at: r.createdAt }));
  const byReferrer = new Map<string, { name: string; friends: number; rewarded: number }>();
  for (const r of rows) { const c = byReferrer.get(r.referrerId) ?? { name: r.referrer, friends: 0, rewarded: 0 }; c.friends++; if (r.rewarded) c.rewarded++; byReferrer.set(r.referrerId, c); }
  return {
    referred: rows.length, converted: rows.filter((r) => r.rewarded).length,
    top: [...byReferrer].map(([customerId, c]) => ({ customerId, ...c })).sort((a, b) => b.rewarded - a.rewarded || b.friends - a.friends).slice(0, 6),
    rows: rows.slice(0, 50),
  };
}

