// Integration (seeded DB): config, points & cashback on invoices (once only), wallet payments, voids, rewards, adjustments, isolation, roles.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { DEFAULT_CONFIG } from "./rules";
import { onSaleCreated } from "./service";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};

const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who;
let staffId: string, svcId: string, c1: string, c2: string, bCust: string;
const state = async (w: Who, id: string) => (await call(w, "GET", `/loyalty/customers/${id}`)).body.data;
const sale = (w: Who, o: Record<string, unknown> = {}) => call(w, "POST", "/cashier/sales", { customerId: c1, lines: [{ kind: "SERVICE", refId: svcId, name: "رنگ ریشه", qty: 1, price: 1_000_000, staffId }], payments: [{ method: "CASH", amount: 1_000_000 }], ...o });

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `loy-${k}`, slug: `loy-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["customers", "staff", "services", "cashier", "loyalty"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  staffId = (await call(A, "POST", "/staff", { name: "مریم", commissionPct: 30 })).body.data.id;
  svcId = (await call(A, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_000_000, durationMin: 60, staffIds: [staffId] })).body.data.id;
  c1 = (await call(A, "POST", "/customers", { name: "سارا محمدی", phone: "09131110001" })).body.data.id;
  c2 = (await call(A, "POST", "/customers", { name: "نیلوفر صادقی", phone: "09131110002" })).body.data.id;
  bCust = (await call(B, "POST", "/customers", { name: "مشتری ب", phone: "09131110003" })).body.data.id;
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.loyaltyTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyConfig.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "loyalty." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => resetRateLimits());

describe("access & config", () => {
  it("is gated by plan/install and role", async () => {
    expect((await call(FREE, "GET", "/loyalty/config")).status).toBe(403);
    expect((await call(null, "GET", "/loyalty/config")).status).toBe(401);
    expect((await call(AS, "PUT", "/loyalty/config", DEFAULT_CONFIG)).status).toBe(403);
    expect((await call(AS, "GET", "/loyalty/overview")).status).toBe(403);
    expect((await call(AS, "GET", `/loyalty/customers/${c1}`)).status).toBe(200);
  });
  it("serves defaults, then the salon's own validated config", async () => {
    expect((await call(A, "GET", "/loyalty/config")).body.data.tiers).toHaveLength(4);
    const bad = (cfg: unknown) => call(A, "PUT", "/loyalty/config", cfg);
    expect((await bad({ ...DEFAULT_CONFIG, tiers: [{ name: "x", from: 10, off: 0, perks: "" }] })).status).toBe(422); // no base tier at 0
    expect((await bad({ ...DEFAULT_CONFIG, tiers: [{ name: "x", from: 0, off: 0 }, { name: "x", from: 5, off: 0 }] })).status).toBe(422); // duplicate name
    expect((await bad({ ...DEFAULT_CONFIG, tiers: [{ name: "x", from: 0, off: 101 }] })).status).toBe(422);
    expect((await bad({ ...DEFAULT_CONFIG, rewards: [{ id: "r", name: "r", cost: 5, kind: "wallet", value: 0 }] })).status).toBe(422);
    expect((await bad({ ...DEFAULT_CONFIG, earn: { ...DEFAULT_CONFIG.earn, svc: { pts: 1, per: 5 } } })).status).toBe(422);
    expect((await bad({ ...DEFAULT_CONFIG, cashback: { on: true, pct: 3, minSpend: 500_000, maxPerSale: 300_000 } })).status).toBe(200);
  });
  it("config is per salon", async () => {
    await call(B, "PUT", "/loyalty/config", { ...DEFAULT_CONFIG, cashback: { on: false, pct: 0, minSpend: 0, maxPerSale: 0 } });
    expect((await call(A, "GET", "/loyalty/config")).body.data.cashback.on).toBe(true);
    expect((await call(B, "GET", "/loyalty/config")).body.data.cashback.on).toBe(false);
  });
});

describe("earning on invoices", () => {
  it("awards points and cashback once per invoice, and tracks the tier", async () => {
    const r = await sale(A);
    expect(r.status).toBe(200);
    // 50 visit + floor(1,000,000/100,000)*10 = 150 pts; cashback 3% of 1,000,000 = 30,000
    const s1 = await state(A, c1);
    expect(s1).toMatchObject({ points: 150, lifetime: 150, wallet: 30_000, tier: "برنزی" });
    // replaying the event (a retry, a second worker) changes nothing
    await onSaleCreated(T.a, { id: r.body.data.id }); await onSaleCreated(T.a, { id: r.body.data.id });
    expect(await state(A, c1)).toMatchObject({ points: 150, wallet: 30_000 });
    expect(s1.log.map((l: { kind: string }) => l.kind).sort()).toEqual(["CASHBACK", "EARN"]);
  });
  it("applies the invoice discount to points, skips walk-ins, and ignores debt-only effects on cashback minimum", async () => {
    const before = await state(A, c2);
    await sale(A, { customerId: c2, discountPct: 50, payments: [{ method: "CASH", amount: 500_000 }] });
    // 50 + floor(500,000/100,000)*10 = 100; cashback: paid 500,000 ≥ min 500,000 → 15,000
    expect(await state(A, c2)).toMatchObject({ points: before.points + 100, wallet: before.wallet + 15_000 });
    const walkin = await sale(A, { customerId: null });
    expect(walkin.status).toBe(200); // no customer → nothing to credit, no error
  });
  it("climbs tiers and never drops", async () => {
    for (let i = 0; i < 3; i++) await sale(A, { lines: [{ kind: "SERVICE", refId: svcId, name: "x", qty: 1, price: 2_000_000, staffId }], payments: [{ method: "CASH", amount: 2_000_000 }] });
    const s = await state(A, c1);
    expect(s.lifetime).toBeGreaterThanOrEqual(500);
    expect(["نقره‌ای", "طلایی", "VIP"]).toContain(s.tier);
    const tier = s.tier;
    await call(A, "POST", `/loyalty/customers/${c1}/adjust`, { points: -s.points, note: "صفر کردن" });
    const after = await state(A, c1);
    expect(after.points).toBe(0);
    expect(after.tier).toBe(tier);
  });
});

describe("wallet as a payment method", () => {
  it("pays from the wallet, refuses overspend, and needs a customer", async () => {
    const w0 = (await state(A, c2)).wallet;
    expect(w0).toBeGreaterThan(0);
    const lines = [{ kind: "SERVICE", refId: svcId, name: "ناخن", qty: 1, price: 100_000, staffId }];
    expect((await sale(A, { customerId: c2, lines, payments: [{ method: "WALLET", amount: w0 + 1 }] })).status).toBe(409);
    expect(await state(A, c2)).toMatchObject({ wallet: w0 });
    expect((await sale(A, { customerId: null, lines, payments: [{ method: "WALLET", amount: 1000 }] })).status).toBe(409);
    const r = await sale(A, { customerId: c2, lines, payments: [{ method: "WALLET", amount: 10_000 }, { method: "CASH", amount: 90_000 }] });
    expect(r.status).toBe(200);
    expect(r.body.data.payments.map((p: { method: string }) => p.method).sort()).toEqual(["CASH", "WALLET"]);
    expect((await state(A, c2)).wallet).toBe(w0 - 10_000);
  });
  it("concurrent wallet payments never overspend", async () => {
    await call(A, "POST", `/loyalty/customers/${c2}/adjust`, { wallet: -(await state(A, c2)).wallet + 20_000, note: "تنظیم" });
    const lines = [{ kind: "SERVICE", refId: svcId, name: "x", qty: 1, price: 15_000, staffId }];
    const rs = await Promise.all(Array.from({ length: 5 }, () => sale(A, { customerId: c2, lines, payments: [{ method: "WALLET", amount: 15_000 }] })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await state(A, c2)).wallet).toBe(5_000);
  });
  it("a void returns wallet money and reverses points and cashback", async () => {
    await call(A, "POST", `/loyalty/customers/${c2}/adjust`, { wallet: 100_000, note: "شارژ" });
    const before = await state(A, c2);
    const lines = [{ kind: "SERVICE", refId: svcId, name: "x", qty: 1, price: 600_000, staffId }];
    const r = await sale(A, { customerId: c2, lines, payments: [{ method: "WALLET", amount: 100_000 }, { method: "CASH", amount: 500_000 }] });
    const afterSale = await state(A, c2);
    // 50 + 60 = 110 pts; cashback 3% of the 500,000 paid outside the wallet = 15,000
    expect(afterSale).toMatchObject({ points: before.points + 110, wallet: before.wallet - 100_000 + 15_000 });
    expect((await call(A, "POST", `/cashier/sales/${r.body.data.id}/void`, { reason: "اشتباه" })).status).toBe(200);
    expect(await state(A, c2)).toMatchObject({ points: before.points, wallet: before.wallet });
    // a second void is refused and nothing changes again
    expect((await call(A, "POST", `/cashier/sales/${r.body.data.id}/void`, { reason: "دوباره" })).status).toBe(409);
    expect(await state(A, c2)).toMatchObject({ points: before.points, wallet: before.wallet });
  });
  it("cashier summary reports wallet separately and keeps it out of the cash drawer", async () => {
    const day = new Date().toISOString().slice(0, 10);
    const s = (await call(A, "GET", `/cashier/summary?from=${day}`)).body.data;
    expect(s.wallet).toBeGreaterThan(0);
    expect(s.revenue).toBeGreaterThan(s.cash + s.card + s.online - 1);
  });
});

describe("rewards & adjustments", () => {
  it("redeems a wallet reward (points down, wallet up) and refuses without enough points", async () => {
    await call(A, "POST", `/loyalty/customers/${c1}/adjust`, { points: 1000, wallet: 0, note: "هدیه" });
    const b = await state(A, c1);
    const r = await call(AS, "POST", `/loyalty/customers/${c1}/redeem`, { rewardId: "w1" });
    expect(r.status).toBe(200);
    expect(r.body.data.state).toMatchObject({ points: b.points - 500, wallet: b.wallet + 50_000 });
    const poor = await call(A, "POST", `/loyalty/customers/${c2}/redeem`, { rewardId: "w2" });
    expect([404, 409]).toContain(poor.status);
    expect((await call(A, "POST", `/loyalty/customers/${c1}/redeem`, { rewardId: "nope" })).status).toBe(404);
  });
  it("redeeming a voucher reward only spends points", async () => {
    await call(A, "POST", `/loyalty/customers/${c1}/adjust`, { points: 1200, note: "هدیه" });
    const b = await state(A, c1);
    const r = await call(A, "POST", `/loyalty/customers/${c1}/redeem`, { rewardId: "w3" });
    expect(r.body.data.state).toMatchObject({ points: b.points - 1200, wallet: b.wallet });
  });
  it("adjustments need a reason and can't go below zero", async () => {
    expect((await call(A, "POST", `/loyalty/customers/${c2}/adjust`, { points: 5, note: "" })).status).toBe(422);
    expect((await call(A, "POST", `/loyalty/customers/${c2}/adjust`, { note: "ab" })).status).toBe(422);
    expect((await call(A, "POST", `/loyalty/customers/${c2}/adjust`, { points: -99_999, note: "خیلی زیاد" })).status).toBe(409);
  });
  it("lists members and an overview", async () => {
    const o = (await call(A, "GET", "/loyalty/overview")).body.data;
    expect(o.members).toBeGreaterThanOrEqual(2);
    expect(o.top[0].lifetime).toBeGreaterThanOrEqual(o.top[1].lifetime);
    const m = (await call(A, "GET", "/loyalty/members?sort=wallet&limit=5")).body.data;
    expect(m[0].wallet).toBeGreaterThanOrEqual(m.at(-1).wallet);
  });
});

describe("isolation", () => {
  it("never reveals or touches another salon's customers", async () => {
    expect((await call(A, "GET", `/loyalty/customers/${bCust}`)).status).toBe(404);
    expect((await call(A, "POST", `/loyalty/customers/${bCust}/adjust`, { points: 10, note: "هک" })).status).toBe(404);
    expect((await call(A, "POST", `/loyalty/customers/${bCust}/redeem`, { rewardId: "w1" })).status).toBe(404);
    const bm = (await call(B, "GET", "/loyalty/members")).body.data as { customerId: string }[];
    expect(bm.every((m) => m.customerId === bCust)).toBe(true);
  });
  it("a salon that uninstalls the club stops earning, and its history is kept", async () => {
    await call(B, "POST", "/tenant/modules/loyalty/uninstall", {});
    const r = await call(B, "POST", "/cashier/sales", { customerId: bCust, lines: [{ kind: "SERVICE", name: "x", qty: 1, price: 1_000_000 }], payments: [{ method: "CASH", amount: 1_000_000 }] });
    expect(r.status).toBe(200);
    expect(await prisma.loyaltyTx.count({ where: { tenantId: T.b } })).toBe(0);
  });
});
