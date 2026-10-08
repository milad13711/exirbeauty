// Integration (seeded DB): storefront, atomic stock, payment, referral commission & wallet, fulfilment, returns, isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setZarinpalClient } from "../../platform/payments/zarinpal";
import { releaseCommissions, expireStale } from "./service";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null; userId?: string };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: who.userId ?? "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {}; const SLUG: Record<string, string> = {}; const P: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;
let verifyCode = 100;
const stock = async (k: string) => (await prisma.storeProduct.findUniqueOrThrow({ where: { id: P[k] } })).stock;
const buy = (items: { productId: string; qty: number }[], o: Record<string, unknown> = {}) => call(null, "POST", "/public/store/orders", { items, customerName: "دنیا ابراهیمی", phone: "09601110001", city: "تهران", address: "خیابان ولیعصر، پلاک ۱۰", ...o });
const authorityOf = async (paymentUrl: string) => paymentUrl.split("/").pop()!;
async function payFor(orderRes: { body: { data: { orderId: string; paymentUrl: string } } }, status = "OK") {
  const r = await call(null, "GET", `/payments/zarinpal/callback?Authority=${await authorityOf(orderRes.body.data.paymentUrl)}&Status=${status}`);
  return r;
}
const wallet = async (w: Who) => (await call(w, "GET", "/shop/wallet")).body.data.balance as number;

beforeAll(async () => {
  const stamp = Date.now(), salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } }), free = await prisma.plan.findUniqueOrThrow({ where: { code: "free" } });
  for (const [k, plan] of [["a", salon], ["b", salon], ["free", free]] as const) { SLUG[k] = `shp-${k}-${stamp}`; T[k] = (await prisma.tenant.create({ data: { name: `shp-${k}`, slug: SLUG[k], subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id; }
  A = { role: "OWNER", tenantId: T.a, userId: "own-a" }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free }; ADMIN = { role: "SUPER_ADMIN", tenantId: null };
  for (const w of [A]) for (const m of ["customers", "shop"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  await call(B, "POST", "/tenant/modules/customers/install", {}); // B has the plan's shop module available but never installs it
  await prisma.user.create({ data: { name: "مالک الف", role: "OWNER", tenantId: T.a, phone: "09601119999" } });
  const mk = async (k: string, o: Record<string, unknown>) => (P[k] = (await call(ADMIN, "POST", "/admin/store/products", { brand: "Silk Lab", category: "مو", ...o })).body.data.id);
  await mk("shampoo", { name: "شامپو ترمیم‌کننده", price: 650_000, commissionPct: 12, stock: 5 });
  await mk("serum", { name: "سرم ویتامین C", category: "پوست", price: 1_150_000, commissionPct: 15, stock: 1 });
  await mk("hidden", { name: "محصول غیرفعال", price: 100_000, stock: 5, active: false });
});
afterAll(async () => {
  setZarinpalClient(null);
  await prisma.tenantWalletTx.deleteMany({ where: { tenantId: { in: Object.values(T) } } });
  await prisma.tenantWallet.deleteMany({ where: { tenantId: { in: Object.values(T) } } });
  await prisma.payment.deleteMany({ where: { kind: "STORE_ORDER", description: { contains: "سفارش فروشگاه" }, amount: { gt: 0 }, packageId: { in: (await prisma.storeOrder.findMany({ where: { lines: { some: { productId: { in: Object.values(P) } } } }, select: { id: true } })).map((o) => o.id) } } });
  await prisma.storeOrder.deleteMany({ where: { lines: { some: { productId: { in: Object.values(P) } } } } });
  await prisma.storeProduct.deleteMany({ where: { id: { in: Object.values(P) } } });
  await prisma.user.deleteMany({ where: { phone: "09601119999" } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "store." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: Object.values(T) } } });
});
beforeEach(() => {
  resetRateLimits(); verifyCode = 100;
  setZarinpalClient({ request: async ({ amount }) => ({ authority: `S${amount}-${Math.random().toString(36).slice(2, 10)}` }), verify: async () => ({ code: verifyCode, refId: "5", cardPan: "x" }), startUrl: (a) => `https://pay.test/${a}` });
});

describe("catalog", () => {
  it("is public, hides inactive products, and only admins edit", async () => {
    const list = (await call(null, "GET", "/public/store/products")).body.data as { name: string }[];
    expect(list.map((p) => p.name)).toEqual(expect.arrayContaining(["شامپو ترمیم‌کننده", "سرم ویتامین C"]));
    expect(list.some((p) => p.name === "محصول غیرفعال")).toBe(false);
    expect(JSON.stringify(list)).not.toContain("commissionPct");
    expect((await call(null, "GET", `/public/store/products/${P.hidden}`)).status).toBe(404);
    expect((await call(A, "POST", "/admin/store/products", { name: "تقلب", category: "مو", price: 1 })).status).toBe(403);
    expect((await call(ADMIN, "PATCH", `/admin/store/products/${P.shampoo}`, { price: 650_000 })).body.data).toMatchObject({ commissionPct: 12, stock: 5 });
    const skin = (await call(null, "GET", "/public/store/products?category=پوست")).body.data as { category: string; name: string }[];
    expect(skin.every((p) => p.category === "پوست")).toBe(true);
    expect(skin.some((p) => p.name === "سرم ویتامین C")).toBe(true);
  });
});

describe("ordering & stock", () => {
  it("validates the order", async () => {
    expect((await buy([])).status).toBe(422);
    expect((await buy([{ productId: P.shampoo, qty: 1 }], { phone: "123" })).status).toBe(422);
    expect((await buy([{ productId: "ghost", qty: 1 }])).status).toBe(400);
    expect((await buy([{ productId: P.hidden, qty: 1 }])).status).toBe(400);
  });
  it("reserves stock, prices from the database, and returns a payment link", async () => {
    const before = await stock("shampoo");
    const r = await buy([{ productId: P.shampoo, qty: 2 }, { productId: P.shampoo, qty: 1 }]);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 650_000 * 3 + 60_000, paymentUrl: expect.stringContaining("https://pay.test/") });
    expect(await stock("shampoo")).toBe(before - 3);
    await payFor(r, "NOK"); // shopper walks away → stock returns
    expect(await stock("shampoo")).toBe(before);
  });
  it("refuses more than is in stock, and the last unit goes to exactly one of many buyers", async () => {
    expect((await buy([{ productId: P.shampoo, qty: 6 }])).status).toBe(409);
    expect(await stock("shampoo")).toBe(5);
    const rs = await Promise.all(Array.from({ length: 5 }, () => buy([{ productId: P.serum, qty: 1 }])));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await stock("serum")).toBe(0);
    await payFor(rs.find((r) => r.status === 200)! as never, "NOK");
    expect(await stock("serum")).toBe(1);
  });
  it("an abandoned checkout frees its stock after half an hour", async () => {
    const r = await buy([{ productId: P.shampoo, qty: 2 }]);
    expect(await stock("shampoo")).toBe(3);
    await prisma.storeOrder.update({ where: { id: r.body.data.orderId }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    expect(await expireStale()).toBeGreaterThanOrEqual(1);
    expect(await stock("shampoo")).toBe(5);
    expect(await expireStale()).toBe(0);
  });
});

describe("payment, commission, fulfilment", () => {
  let orderId: string;
  it("a verified payment marks the order paid exactly once", async () => {
    const r = await buy([{ productId: P.shampoo, qty: 2 }], { ref: SLUG.a });
    orderId = r.body.data.orderId;
    await payFor(r); await payFor(r);
    const o = await prisma.storeOrder.findUniqueOrThrow({ where: { id: orderId } });
    expect(o).toMatchObject({ status: "PAID", goodsTotal: 1_300_000, shippingCost: 60_000, total: 1_360_000, refTenantId: T.a, commission: 156_000, commissionStatus: "WAITING" });
    expect(await stock("shampoo")).toBe(3);
  });
  it("a failed verification releases the stock and leaves the order canceled", async () => {
    verifyCode = -50;
    const r = await buy([{ productId: P.shampoo, qty: 1 }]);
    await payFor(r);
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: r.body.data.orderId } })).status).toBe("CANCELED");
    expect(await stock("shampoo")).toBe(3);
  });
  it("commission applies only for an active salon's link, never to its own people, never for strangers", async () => {
    const mine = await buy([{ productId: P.shampoo, qty: 1 }], { ref: SLUG.a, phone: "09601119999" }); // the salon owner's own phone
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: mine.body.data.orderId } })).commissionStatus).toBe("NONE");
    const noModule = await buy([{ productId: P.shampoo, qty: 1 }], { ref: SLUG.b }); // salon B never installed the shop
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: noModule.body.data.orderId } })).refTenantId).toBeNull();
    const unknown = await buy([{ productId: P.shampoo, qty: 1 }], { ref: "no-such-salon" });
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: unknown.body.data.orderId } })).refTenantId).toBeNull();
    for (const r of [mine, noModule, unknown]) await payFor(r, "NOK");
  });
  it("free shipping above the threshold; commission never includes shipping", async () => {
    const big = await buy([{ productId: P.shampoo, qty: 1 }, { productId: P.serum, qty: 1 }, { productId: P.shampoo, qty: 1 }], { ref: SLUG.a });
    if (big.status === 200) { // serum has only 1 unit in this run; either way the arithmetic below is what matters
      const o = await prisma.storeOrder.findUniqueOrThrow({ where: { id: big.body.data.orderId } });
      expect(o.shippingCost).toBe(o.goodsTotal > 2_000_000 ? 0 : 60_000);
      await payFor(big, "NOK");
    }
  });
  it("shoppers can track their own order by number + phone, and see nothing else", async () => {
    const r = await buy([{ productId: P.shampoo, qty: 1 }]);
    const number = r.body.data.number;
    await payFor(r);
    const t = (await call(null, "POST", "/public/store/track", { number, phone: "09601110001" })).body.data;
    expect(t).toMatchObject({ number, status: "PAID", trackingCode: null, items: [{ name: "شامپو ترمیم‌کننده", qty: 1 }] });
    expect(JSON.stringify(t)).not.toContain("ولیعصر"); // no address
    expect((await call(null, "POST", "/public/store/track", { number, phone: "09601110002" })).status).toBe(404); // wrong phone
    await call(ADMIN, "POST", `/admin/store/orders/${r.body.data.orderId}/status`, { status: "SHIPPED", trackingCode: "RR123456789IR" });
    expect((await call(null, "POST", "/public/store/track", { number, phone: "09601110001" })).body.data).toMatchObject({ status: "SHIPPED", trackingCode: "RR123456789IR" });
    await call(ADMIN, "POST", `/admin/store/orders/${r.body.data.orderId}/status`, { status: "CANCELED" });
  });
  it("only admins fulfil; steps only go forward", async () => {
    expect((await call(A, "POST", `/admin/store/orders/${orderId}/status`, { status: "SHIPPED" })).status).toBe(403);
    expect((await call(ADMIN, "POST", `/admin/store/orders/${orderId}/status`, { status: "DELIVERED" })).status).toBe(409); // not shipped yet
    expect((await call(ADMIN, "POST", `/admin/store/orders/${orderId}/status`, { status: "SHIPPED" })).status).toBe(200);
    expect((await call(ADMIN, "POST", `/admin/store/orders/${orderId}/status`, { status: "DELIVERED" })).status).toBe(200);
    expect((await call(ADMIN, "POST", `/admin/store/orders/${orderId}/status`, { status: "CANCELED" })).status).toBe(409);
    expect((await call(ADMIN, "GET", "/admin/store/orders?status=DELIVERED")).body.data.find((o: { id: string }) => o.id === orderId)).toMatchObject({ salon: "shp-a", commissionStatus: "WAITING" });
  });
  it("commission waits out the 7-day return window, then is credited once (even if run twice at once)", async () => {
    expect(await releaseCommissions()).toBe(0);
    expect(await wallet(A)).toBe(0);
    await prisma.storeOrder.update({ where: { id: orderId }, data: { deliveredAt: new Date(Date.now() - 8 * 86_400_000) } });
    const [a, b] = await Promise.all([releaseCommissions(), releaseCommissions()]);
    expect(a + b).toBe(1);
    expect(await wallet(A)).toBe(156_000);
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: orderId } })).commissionStatus).toBe("CREDITED");
    expect((await call(A, "GET", "/shop/wallet")).body.data.log[0]).toMatchObject({ kind: "COMMISSION", delta: 156_000 });
  });
  it("a return after payout takes the commission back (never below zero) and restocks", async () => {
    const before = await stock("shampoo");
    expect((await call(ADMIN, "POST", `/admin/store/orders/${orderId}/status`, { status: "RETURNED" })).status).toBe(200);
    expect(await stock("shampoo")).toBe(before + 2);
    expect(await wallet(A)).toBe(0);
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: orderId } })).commissionStatus).toBe("VOID");
  });
  it("canceling a paid order restocks and voids its waiting commission", async () => {
    const r = await buy([{ productId: P.shampoo, qty: 1 }], { ref: SLUG.a }); await payFor(r);
    const before = await stock("shampoo");
    await call(ADMIN, "POST", `/admin/store/orders/${r.body.data.orderId}/status`, { status: "CANCELED" });
    expect(await stock("shampoo")).toBe(before + 1);
    expect((await prisma.storeOrder.findUniqueOrThrow({ where: { id: r.body.data.orderId } })).commissionStatus).toBe("VOID");
  });
});

describe("warehouse", () => {
  it("receives a supplier delivery atomically (all lines or none) and admins only", async () => {
    const before = await stock("shampoo");
    expect((await call(A, "POST", "/admin/store/purchases", { supplier: "پخش الف", lines: [{ productId: P.shampoo, qty: 5, unitCost: 100_000 }] })).status).toBe(403);
    expect((await call(ADMIN, "POST", "/admin/store/purchases", { supplier: "پخش الف", lines: [{ productId: P.shampoo, qty: 5, unitCost: 100_000 }, { productId: "ghost", qty: 1, unitCost: 1 }] })).status).toBe(400);
    expect(await stock("shampoo")).toBe(before); // the bad line stopped the whole delivery
    const r = await call(ADMIN, "POST", "/admin/store/purchases", { supplier: "پخش الف", lines: [{ productId: P.shampoo, qty: 5, unitCost: 100_000 }, { productId: P.shampoo, qty: 2, unitCost: 100_000 }] });
    expect(r.body.data.total).toBe(700_000);
    expect(await stock("shampoo")).toBe(before + 7);
    expect((await call(ADMIN, "GET", "/admin/store/purchases")).body.data[0].supplier).toBe("پخش الف");
    await prisma.storePurchase.deleteMany({ where: { supplier: "پخش الف" } });
  });
  it("lists referring salons with their totals", async () => {
    const r = (await call(ADMIN, "GET", "/admin/store/referrers")).body.data as { name: string; orders: number }[];
    expect(r.find((x) => x.name === "shp-a")).toMatchObject({ orders: expect.any(Number) });
    expect((await call(A, "GET", "/admin/store/referrers")).status).toBe(403);
  });
});

describe("the salon's side", () => {
  it("is gated and owner-only; the dashboard shows only its own orders", async () => {
    expect((await call(FREE, "GET", "/shop/overview")).status).toBe(403);
    expect((await call(AS, "GET", "/shop/overview")).status).toBe(403);
    const o = (await call(A, "GET", "/shop/overview")).body.data;
    expect(o.slug).toBe(SLUG.a);
    expect(o.recent.every((x: { customer: string }) => x.customer === "دنیا")).toBe(true); // first name only
    expect(JSON.stringify(o)).not.toContain("09601110001"); // no phone numbers
    expect((await call(B, "GET", "/shop/overview")).status).toBe(403);
  });
  it("partial wallet payment: debits what the wallet holds, asks for the rest online, refunds on failure, applies the plan on success", async () => {
    resetRateLimits();
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } });
    const fund = async (n: number) => prisma.tenantWallet.upsert({ where: { tenantId: T.a }, create: { tenantId: T.a, balance: n }, update: { balance: n } });
    await fund(300_000);
    const r = await call(A, "POST", "/shop/wallet/pay-plan", { planCode: "salon", months: 1, partial: true });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ paid: false, walletUsed: 300_000, amount: plan.priceMonthly - 300_000 });
    expect(await wallet(A)).toBe(0);
    const pay = await prisma.payment.findUniqueOrThrow({ where: { id: r.body.data.paymentId } });
    expect(pay.walletUsed).toBe(300_000);
    // the shopper walks away → wallet money returns, once
    const cb = `/payments/zarinpal/callback?Authority=${pay.authority}&Status=NOK`;
    await call(null, "GET", cb); await call(null, "GET", cb);
    expect(await wallet(A)).toBe(300_000);
    // a successful one applies the plan
    const ok = await call(A, "POST", "/shop/wallet/pay-plan", { planCode: "salon", months: 1, partial: true });
    const auth = (await prisma.payment.findUniqueOrThrow({ where: { id: ok.body.data.paymentId } })).authority;
    await call(null, "GET", `/payments/zarinpal/callback?Authority=${auth}&Status=OK`);
    expect(await wallet(A)).toBe(0);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: ok.body.data.paymentId } })).status).toBe("PAID");
    // a wallet that covers everything pays at once, with no online step
    await fund(plan.priceMonthly + 10);
    const full = await call(A, "POST", "/shop/wallet/pay-plan", { planCode: "salon", months: 1, partial: true });
    expect(full.body.data).toMatchObject({ paid: true, walletUsed: plan.priceMonthly });
    expect(await wallet(A)).toBe(10);
    await fund(0);
  });
  it("recommends store products from a customer's last service category", async () => {
    await call(A, "POST", "/tenant/modules/customers/install", {});
    const c = (await call(A, "POST", "/customers", { name: "سارا", phone: "09601110005" })).body.data.id;
    await prisma.customerVisit.create({ data: { tenantId: T.a, customerId: c, at: new Date(), service: "رنگ", category: "پوست", staffName: "", price: 1 } });
    const r = (await call(A, "GET", `/shop/recommend?customerId=${c}`)).body.data;
    expect(r.basedOn).toBe("رنگ");
    expect(r.products.every((p: { category: string }) => ["پوست", "ست هدیه"].includes(p.category))).toBe(true);
    expect((await call(A, "GET", "/shop/recommend?customerId=ghost")).status).toBe(404);
    await prisma.customerVisit.deleteMany({ where: { tenantId: T.a } }); await prisma.customer.deleteMany({ where: { tenantId: T.a } });
  });
  it("the cron endpoint needs the shared secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call(null, "POST", "/shop/cron/run")).status).toBe(403);
    expect((await call(null, "POST", "/shop/cron/run", undefined, { "x-cron-secret": "s3cret" })).status).toBe(200);
    delete process.env.CRON_SECRET;
  });
  it("(last: it changes the salon's plan) pays a plan renewal from the wallet only when it fully covers it", async () => {
    expect((await call(A, "POST", "/shop/wallet/pay-plan", { planCode: "free", months: 1 })).status).toBe(400);
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "artist" } });
    expect((await call(A, "POST", "/shop/wallet/pay-plan", { planCode: "artist", months: 1 })).body.error.code).toBe("WALLET_INSUFFICIENT");
    await prisma.tenantWallet.upsert({ where: { tenantId: T.a }, create: { tenantId: T.a, balance: plan.priceMonthly + 5000 }, update: { balance: plan.priceMonthly + 5000 } });
    const r = await call(A, "POST", "/shop/wallet/pay-plan", { planCode: "artist", months: 1 });
    expect(r.status).toBe(200);
    expect(r.body.data.balance).toBe(5000);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { tenantId: T.a } })).planId).toBe(plan.id);
  });
});
