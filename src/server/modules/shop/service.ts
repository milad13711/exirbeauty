import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import { assertModuleActive, changePlan } from "../../platform/modules/service";
import { PENDING_TTL_MS, canMove, shippingFor, commissionOf, earnsCommission, isReleasable, orderTotal, recommendCategories, type Status } from "./rules";

// The store is the platform's own: products and orders are global. A salon sees only the orders that came through its link.

const isDup = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

// ───────── catalog ─────────

type P = { id: string; name: string; brand: string; category: string; price: number; oldPrice: number | null; commissionPct: number; stock: number; description: string; active: boolean };
const pub = (p: P) => ({ id: p.id, name: p.name, brand: p.brand, category: p.category, price: p.price, oldPrice: p.oldPrice, stock: p.stock, description: p.description });

export async function catalog(f: { category?: string; q?: string }) {
  const rows = await prisma.storeProduct.findMany({ where: { active: true, ...(f.category ? { category: f.category } : {}), ...(f.q ? { OR: [{ name: { contains: f.q } }, { brand: { contains: f.q } }] } : {}) }, orderBy: { createdAt: "asc" }, take: 200 });
  return rows.map(pub);
}
export async function product(id: string) {
  const p = await prisma.storeProduct.findFirst({ where: { id, active: true } });
  if (!p) throw notFound("محصول پیدا نشد");
  return pub(p);
}

export const adminProducts = async () => (await prisma.storeProduct.findMany({ orderBy: { createdAt: "asc" } })).map((p) => ({ ...pub(p), commissionPct: p.commissionPct, active: p.active }));
export const adminCreateProduct = (b: Omit<P, "id">) => prisma.storeProduct.create({ data: b });
export async function adminUpdateProduct(id: string, b: Partial<Omit<P, "id">>) {
  if (!(await prisma.storeProduct.count({ where: { id } }))) throw notFound("محصول پیدا نشد");
  return prisma.storeProduct.update({ where: { id }, data: b });
}

/** For the storefront banner: the salon behind a link, if it actually runs the shop. */
export async function referrer(slug: string) {
  const t = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true, status: true } });
  if (!t || t.status !== "ACTIVE" || !(await assertModuleActive(t.id, "shop").then(() => true, () => false))) throw notFound("سالن پیدا نشد");
  return { name: t.name };
}

// ───────── placing an order ─────────

/** Reserves stock with a conditional UPDATE per product, all or nothing, so two shoppers can't buy the last unit. */
async function reserve(tx: Prisma.TransactionClient, items: { productId: string; qty: number }[]) {
  for (const it of items) {
    const n = await tx.$executeRaw`UPDATE "StoreProduct" SET "stock" = "stock" - ${it.qty} WHERE "id" = ${it.productId} AND "active" = true AND "stock" >= ${it.qty}`;
    if (n !== 1) throw conflict("موجودی یکی از کالاها کافی نیست", "OUT_OF_STOCK", { productId: it.productId });
  }
}
const restock = (tx: Prisma.TransactionClient, lines: { productId: string; qty: number }[]) =>
  Promise.all(lines.map((l) => tx.$executeRaw`UPDATE "StoreProduct" SET "stock" = "stock" + ${l.qty} WHERE "id" = ${l.productId}`));

export async function createOrder(b: { items: { productId: string; qty: number }[]; customerName: string; phone: string; city: string; address: string; postalCode: string; ref?: string }) {
  const merged = new Map<string, number>();
  for (const i of b.items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.qty);
  const items = [...merged].map(([productId, qty]) => ({ productId, qty }));
  const products = await prisma.storeProduct.findMany({ where: { id: { in: items.map((i) => i.productId) }, active: true } });
  if (products.length !== items.length) throw badRequest("یکی از کالاهای سبد دیگر موجود نیست");
  const lines = items.map((i) => { const p = products.find((x) => x.id === i.productId)!; return { productId: p.id, name: p.name, qty: i.qty, price: p.price, commissionPct: p.commissionPct }; });

  // The salon behind the link earns commission only while it runs the shop module, and never on its own people's orders.
  let refTenantId: string | null = null, refVia = "";
  if (b.ref) {
    const t = await prisma.tenant.findUnique({ where: { slug: b.ref }, select: { id: true, name: true, status: true } });
    if (t && t.status === "ACTIVE" && (await assertModuleActive(t.id, "shop").then(() => true, () => false))) {
      const phones = (await prisma.user.findMany({ where: { tenantId: t.id, phone: { not: null } }, select: { phone: true } })).map((u) => u.phone!);
      if (earnsCommission(b.phone, phones)) { refTenantId = t.id; refVia = `لینک سالن ${t.name}`; }
    }
  }
  const commission = refTenantId ? commissionOf(lines) : 0;
  const goodsTotal = orderTotal(lines), shippingCost = shippingFor(goodsTotal);
  return prisma.$transaction(async (tx) => {
    await reserve(tx, items);
    return tx.storeOrder.create({
      data: { customerName: b.customerName, phone: b.phone, city: b.city, address: b.address, postalCode: b.postalCode, goodsTotal, shippingCost, total: goodsTotal + shippingCost, refTenantId, refVia, commission, commissionStatus: refTenantId && commission > 0 ? "WAITING" : "NONE",
        lines: { create: lines.map(({ commissionPct, ...l }) => { void commissionPct; return l; }) } },
      include: { lines: true },
    });
  });
}

export async function orderForPayment(orderId: string) {
  const o = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!o) throw notFound("سفارش پیدا نشد");
  if (o.status !== "PENDING_PAYMENT") throw conflict("این سفارش قبلاً پرداخت یا لغو شده است", "NOT_PAYABLE");
  return o;
}

/** Called by the payment callback once the money is verified. */
export async function markPaid(orderId: string) {
  const o = await prisma.storeOrder.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!o) throw notFound("سفارش پیدا نشد");
  if (o.status === "PENDING_PAYMENT") { await prisma.storeOrder.updateMany({ where: { id: orderId, status: "PENDING_PAYMENT" }, data: { status: "PAID" } }); return; }
  if (o.status === "CANCELED") {
    // The reservation expired before the shopper paid: take the stock again if it is still there, otherwise flag for a manual refund.
    await prisma.$transaction(async (tx) => { await reserve(tx, o.lines); await tx.storeOrder.update({ where: { id: orderId }, data: { status: "PAID" } }); });
  }
}

/** A failed or abandoned payment gives the reserved stock back (once). */
export async function releaseOrder(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.storeOrder.updateMany({ where: { id: orderId, status: "PENDING_PAYMENT" }, data: { status: "CANCELED", commissionStatus: "VOID" } });
    if (claimed.count !== 1) return;
    await restock(tx, await tx.storeOrderLine.findMany({ where: { orderId }, select: { productId: true, qty: true } }));
  });
}

// ───────── fulfilment (platform team) ─────────

export async function adminOrders(status?: Status) {
  const rows = await prisma.storeOrder.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200, include: { lines: true } });
  const salons = new Map((await prisma.tenant.findMany({ where: { id: { in: rows.map((r) => r.refTenantId).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  return rows.map((o) => ({ id: o.id, number: o.number, customerName: o.customerName, phone: o.phone, city: o.city, address: o.address, total: o.total, shippingCost: o.shippingCost, trackingCode: o.trackingCode, status: o.status, commission: o.commission, commissionStatus: o.commissionStatus, salon: o.refTenantId ? salons.get(o.refTenantId) ?? null : null, createdAt: o.createdAt, lines: o.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })) }));
}

export async function setStatus(orderId: string, to: "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELED", trackingCode?: string) {
  const o = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!o) throw notFound("سفارش پیدا نشد");
  if (!canMove(o.status, to)) throw conflict("این تغییر وضعیت مجاز نیست", "BAD_TRANSITION", { from: o.status, to });
  await prisma.$transaction(async (tx) => {
    // Claim the transition so two admins can't both apply it (and double-restock).
    const claimed = await tx.storeOrder.updateMany({ where: { id: orderId, status: o.status }, data: { status: to, ...(to === "DELIVERED" ? { deliveredAt: new Date() } : {}), ...(to === "SHIPPED" && trackingCode ? { trackingCode } : {}) } });
    if (claimed.count !== 1) throw conflict("وضعیت سفارش همین الان تغییر کرد", "STALE");
    if (to === "CANCELED" || to === "RETURNED") {
      await restock(tx, await tx.storeOrderLine.findMany({ where: { orderId }, select: { productId: true, qty: true } }));
      if (o.commissionStatus === "WAITING") await tx.storeOrder.update({ where: { id: orderId }, data: { commissionStatus: "VOID" } });
      if (o.commissionStatus === "CREDITED" && o.refTenantId) await clawBack(tx, o.refTenantId, o.commission, orderId);
    }
  });
}

/** What a shopper may see about their own order (found by number + the phone it was placed with); no address or salon details. */
export async function track(number: number, phone: string) {
  const o = await prisma.storeOrder.findFirst({ where: { number, phone }, include: { lines: true } });
  if (!o) throw notFound("سفارشی با این مشخصات پیدا نشد");
  return { number: o.number, status: o.status, total: o.total, shippingCost: o.shippingCost, trackingCode: o.trackingCode, createdAt: o.createdAt, items: o.lines.map((l) => ({ name: l.name, qty: l.qty })) };
}

// ───────── commission & the salon wallet ─────────

async function credit(tx: Prisma.TransactionClient, tenantId: string, amount: number, kind: "COMMISSION" | "ADJUST", ref: string | null, note: string) {
  await tx.tenantWallet.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
  const [{ balance }] = await tx.$queryRaw<{ balance: number }[]>`UPDATE "TenantWallet" SET "balance" = "balance" + ${amount}, "updatedAt" = now() WHERE "tenantId" = ${tenantId} RETURNING "balance"`;
  await tx.tenantWalletTx.create({ data: { tenantId, kind, delta: amount, balanceAfter: balance, ref, note } });
}
/** A returned order whose commission was already paid takes it back (down to zero if the salon already spent it). */
async function clawBack(tx: Prisma.TransactionClient, tenantId: string, amount: number, orderId: string) {
  const rows = await tx.$queryRaw<{ balance: number }[]>`SELECT "balance" FROM "TenantWallet" WHERE "tenantId" = ${tenantId} FOR UPDATE`;
  const take = Math.min(amount, rows[0]?.balance ?? 0);
  if (take > 0) await credit(tx, tenantId, -take, "ADJUST", null, `بازگشت پورسانت سفارش مرجوعی ${orderId.slice(-6)}`);
  await tx.storeOrder.update({ where: { id: orderId }, data: { commissionStatus: "VOID" } });
}

/** Pays commissions whose return window has passed; each order is claimed first, so it is credited exactly once. */
export async function releaseCommissions(now = new Date()) {
  const due = await prisma.storeOrder.findMany({ where: { status: "DELIVERED", commissionStatus: "WAITING", deliveredAt: { lte: new Date(now.getTime() - 7 * 86_400_000) }, refTenantId: { not: null } }, take: 200 });
  let credited = 0;
  for (const o of due) {
    if (!isReleasable(o, now)) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.storeOrder.updateMany({ where: { id: o.id, commissionStatus: "WAITING", status: "DELIVERED" }, data: { commissionStatus: "CREDITED" } });
        if (claimed.count !== 1) return;
        await credit(tx, o.refTenantId!, o.commission, "COMMISSION", o.id, `پورسانت سفارش ${o.number}`);
        credited++;
      });
    } catch (e) { if (!isDup(e)) throw e; }
  }
  return credited;
}

/** Unpaid orders give their reserved stock back after half an hour. */
export async function expireStale(now = new Date()) {
  const stale = await prisma.storeOrder.findMany({ where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(now.getTime() - PENDING_TTL_MS) } }, select: { id: true }, take: 200 });
  for (const s of stale) await releaseOrder(s.id);
  return stale.length;
}

/** Takes up to `amount` from the wallet (whatever is there), atomically; returns what was actually taken. */
export async function debitUpTo(tx: Prisma.TransactionClient, tenantId: string, amount: number, note: string) {
  const rows = await tx.$queryRaw<{ before: number; balance: number }[]>`
    UPDATE "TenantWallet" w SET "balance" = w."balance" - LEAST(w."balance", ${amount}), "updatedAt" = now()
    FROM (SELECT "balance" AS before FROM "TenantWallet" WHERE "tenantId" = ${tenantId} FOR UPDATE) o
    WHERE w."tenantId" = ${tenantId} RETURNING o.before AS "before", w."balance" AS "balance"`;
  if (!rows.length) return 0;
  const taken = rows[0].before - rows[0].balance;
  if (taken > 0) await tx.tenantWalletTx.create({ data: { tenantId, kind: "PLAN_PAYMENT", delta: -taken, balanceAfter: rows[0].balance, note } });
  return taken;
}
/** Gives wallet money back (a payment it was set against failed). */
export async function creditBack(tenantId: string, amount: number, note: string) {
  if (amount > 0) await prisma.$transaction((tx) => credit(tx, tenantId, amount, "ADJUST", null, note));
}

export async function wallet(tenantId: string) {
  const [w, log] = await Promise.all([prisma.tenantWallet.findUnique({ where: { tenantId } }), prisma.tenantWalletTx.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, kind: true, delta: true, balanceAfter: true, note: true, createdAt: true } })]);
  return { balance: w?.balance ?? 0, log };
}

/** Pays a plan renewal entirely from the wallet; the debit is one conditional UPDATE, refunded if the plan change fails. */
export async function payPlanFromWallet(tenantId: string, planCode: string, months: number) {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.active) throw notFound("پلن پیدا نشد");
  if (plan.priceMonthly <= 0) throw badRequest("این پلن رایگان است و پرداخت ندارد");
  const amount = plan.priceMonthly * months;
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ balance: number }[]>`UPDATE "TenantWallet" SET "balance" = "balance" - ${amount}, "updatedAt" = now() WHERE "tenantId" = ${tenantId} AND "balance" >= ${amount} RETURNING "balance"`;
    if (!rows.length) throw conflict("موجودی کیف پول برای پرداخت کامل کافی نیست؛ پرداخت آنلاین را انتخاب کنید", "WALLET_INSUFFICIENT", { amount });
    await tx.tenantWalletTx.create({ data: { tenantId, kind: "PLAN_PAYMENT", delta: -amount, balanceAfter: rows[0].balance, note: `اشتراک ${plan.title} — ${months} ماه` } });
    await changePlan(tenantId, planCode, months);
  });
  return wallet(tenantId);
}

// ───────── the salon's view ─────────

export async function overview(tenantId: string) {
  const [orders, w, tenant] = await Promise.all([
    prisma.storeOrder.findMany({ where: { refTenantId: tenantId }, orderBy: { createdAt: "desc" }, take: 100, include: { lines: true } }),
    wallet(tenantId), prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { slug: true } }),
  ]);
  const real = orders.filter((o) => o.status !== "PENDING_PAYMENT" && o.status !== "CANCELED");
  const top = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of real) for (const l of o.lines) { const c = top.get(l.productId) ?? { name: l.name, qty: 0, revenue: 0 }; c.qty += l.qty; c.revenue += l.price * l.qty; top.set(l.productId, c); }
  return {
    slug: tenant.slug, wallet: w.balance,
    orders: real.length, sales: real.filter((o) => o.status !== "RETURNED").reduce((a, o) => a + o.total, 0),
    credited: orders.filter((o) => o.commissionStatus === "CREDITED").reduce((a, o) => a + o.commission, 0),
    pending: orders.filter((o) => o.commissionStatus === "WAITING").reduce((a, o) => a + o.commission, 0),
    top: [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recent: real.slice(0, 10).map((o) => ({ id: o.id, number: o.number, customer: o.customerName.split(" ")[0], total: o.total, status: o.status, commission: o.commission, commissionStatus: o.commissionStatus, createdAt: o.createdAt, items: o.lines.map((l) => l.name) })),
  };
}

/** Store products that suit a customer, from the category of their last service. */
export async function recommend(tenantId: string, customerId: string) {
  if (!(await prisma.customer.count({ where: { id: customerId, tenantId } }))) throw notFound("مشتری پیدا نشد");
  const last = await prisma.customerVisit.findFirst({ where: { tenantId, customerId }, orderBy: { at: "desc" }, select: { category: true, service: true } });
  const cats = recommendCategories(last?.category || null);
  const rows = await prisma.storeProduct.findMany({ where: { active: true, stock: { gt: 0 }, category: { in: cats } }, orderBy: { createdAt: "asc" }, take: 3 });
  return { basedOn: last?.service ?? null, products: rows.map((p) => ({ ...pub(p), commissionPct: p.commissionPct })) };
}
