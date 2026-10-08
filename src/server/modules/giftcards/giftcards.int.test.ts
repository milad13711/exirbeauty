// Integration (seeded DB): issuing through the cashier (liability), secret codes, spending as a payment, refunds, voids, throttling, isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setSmsGateway } from "../../platform/sms";
import { tehranNow } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;
let sent: { to: string; text: string }[] = [];
const issue = (o: Record<string, unknown> = {}, w: Who = AS) => call(w, "POST", "/giftcards", { fromName: "علی رضایی", toName: "مریم", toPhone: "09201110001", occasion: "تولد", amount: 1_000_000, payments: [{ method: "CASH", amount: (o.amount as number | undefined) ?? 1_000_000 }], ...o });
const pay = (code: string, amount: number, extra: Record<string, unknown> = {}, w: Who = A) =>
  call(w, "POST", "/cashier/sales", { lines: [{ kind: "SERVICE", name: "رنگ", qty: 1, price: amount }], payments: [{ method: "GIFT", amount, ref: code }], ...extra });
const balanceOf = async (code: string) => (await call(A, "POST", "/giftcards/lookup", { code })).body.data.balance as number;
const summary = async () => (await call(A, "GET", `/cashier/summary?from=${tehranNow().date}`)).body.data;

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `gift-${k}`, slug: `gift-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free }; ADMIN = { role: "SUPER_ADMIN", tenantId: null };
  for (const w of [A, B]) for (const m of ["customers", "cashier", "giftcards"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
});
afterAll(async () => {
  setSmsGateway(null);
  const tenants = [T.a, T.b, T.free];
  await prisma.giftCardTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.giftCard.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsMessage.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "giftcard." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => { resetRateLimits(); sent = []; setSmsGateway({ send: async (to, text) => { sent.push({ to, text }); } }); });

describe("access & issuing", () => {
  it("is gated by plan and role", async () => {
    expect((await call(FREE, "GET", "/giftcards")).status).toBe(403);
    expect((await call(null, "POST", "/giftcards/lookup", { code: "ABCDEFGH" })).status).toBe(401);
    expect((await call(AS, "GET", "/giftcards")).status).toBe(403);
    expect((await call(AS, "GET", "/giftcards/overview")).status).toBe(403);
  });
  it("validates the amount, recipient and buyer", async () => {
    expect((await issue({ amount: 50_000, payments: [] })).status).toBe(422);
    expect((await issue({ toPhone: "123" })).status).toBe(400);
    expect((await issue({ toName: "ا" })).status).toBe(422);
    expect((await issue({ fromName: "", buyerId: null })).status).toBe(400);
    expect((await issue({ buyerId: "ghost" })).status).toBe(400);
    expect((await issue({ payments: [{ method: "GIFT", amount: 1000 }] })).status).toBe(422); // can't buy a card with a card
    expect(await prisma.giftCard.count({ where: { tenantId: T.a } })).toBe(0); // nothing left behind
  });
  it("issues a card: an invoice, a secret code shown once, never listed again — and it is not revenue", async () => {
    const before = await summary();
    const r = await issue();
    expect(r.status).toBe(200);
    expect(r.body.data.code).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){2}$/);
    expect(r.body.data).toMatchObject({ amount: 1_000_000, balance: 1_000_000, status: "ACTIVE", saleNumber: expect.any(Number) });
    expect(sent).toHaveLength(0); // sms module isn't installed → no text, card still valid
    expect(r.body.data.smsSent).toBe(false);
    const list = (await call(A, "GET", "/giftcards")).body.data;
    expect(JSON.stringify(list)).not.toContain(r.body.data.code.replace(/-/g, ""));
    expect(list[0]).toMatchObject({ last4: r.body.data.code.slice(-4), toName: "مریم" });
    expect(JSON.stringify(list)).not.toContain("codeHash");
    const after = await summary();
    expect(after.cash - before.cash).toBe(1_000_000); // the till has the money…
    expect(after.revenue - before.revenue).toBe(0); // …but nothing is earned yet
    expect(after.giftSold - before.giftSold).toBe(1_000_000);
  });
  it("texts the code to the recipient when the salon has SMS with credit", async () => {
    for (const m of ["sms"]) await call(A, "POST", `/tenant/modules/${m}/install`, {});
    await call(ADMIN, "POST", "/admin/sms/adjust", { tenantId: T.a, delta: 5000, note: "t" });
    const r = await issue({ toPhone: "۰۹۲۰۱۱۱۰۰۰۲" });
    expect(r.body.data.smsSent).toBe(true);
    expect(sent[0].to).toBe("09201110002");
    expect(sent[0].text).toContain(r.body.data.code);
    await call(A, "POST", "/tenant/modules/sms/uninstall", {});
  });
  it("shop staff can't sell a gift card through the plain invoice route", async () => {
    const r = await call(A, "POST", "/cashier/sales", { lines: [{ kind: "GIFT", name: "تقلب", qty: 1, price: 1_000_000 }], payments: [{ method: "CASH", amount: 1_000_000 }] });
    expect(r.status).toBe(400);
  });
});

describe("spending", () => {
  let code: string;
  beforeAll(async () => { code = (await issue({ amount: 1_000_000 })).body.data.code; });
  it("looks up by code however it's typed; unknown codes are indistinguishable", async () => {
    const r = await call(AS, "POST", "/giftcards/lookup", { code: code.toLowerCase().replace(/-/g, " ") });
    expect(r.body.data).toMatchObject({ balance: 1_000_000, status: "ACTIVE", toName: "مریم" });
    expect((await call(AS, "POST", "/giftcards/lookup", { code: "AAAA-BBBB-CCCC" })).status).toBe(404);
  });
  it("pays part of an invoice from the card: balance drops, the invoice keeps no secret, revenue is booked", async () => {
    const before = await summary();
    const r = await pay(code, 600_000);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ total: 600_000, paid: 600_000, status: "PAID" });
    expect(r.body.data.payments[0].ref).toMatch(/^gift:/);
    expect(JSON.stringify(r.body.data)).not.toContain(code.replace(/-/g, ""));
    expect(await balanceOf(code)).toBe(400_000);
    const after = await summary();
    expect(after.revenue - before.revenue).toBe(600_000);
    expect(after.giftSpent - before.giftSpent).toBe(600_000);
    expect(after.cash - before.cash).toBe(0); // gift money never enters the drawer
  });
  it("refuses overspending, bad codes and mixes the card with cash correctly", async () => {
    expect((await pay(code, 500_000)).status).toBe(409);
    expect((await pay("ZZZZ-ZZZZ-ZZZZ", 1000)).status).toBe(409);
    expect((await pay("", 1000)).status).toBe(409);
    expect(await balanceOf(code)).toBe(400_000);
    const r = await call(A, "POST", "/cashier/sales", { lines: [{ kind: "SERVICE", name: "رنگ", qty: 1, price: 500_000 }], payments: [{ method: "GIFT", amount: 300_000, ref: code }, { method: "CASH", amount: 200_000 }] });
    expect(r.status).toBe(200);
    expect(await balanceOf(code)).toBe(100_000);
  });
  it("two payments from the same card in one invoice are added together, not double-counted", async () => {
    const r = await call(A, "POST", "/cashier/sales", { lines: [{ kind: "SERVICE", name: "رنگ", qty: 1, price: 100_000 }], payments: [{ method: "GIFT", amount: 60_000, ref: code }, { method: "GIFT", amount: 60_000, ref: code }] });
    expect(r.status).toBe(409); // 120,000 > 100,000 left
    expect(await balanceOf(code)).toBe(100_000);
  });
  it("concurrent invoices never spend more than the card holds; a fully spent card says so", async () => {
    const rs = await Promise.all(Array.from({ length: 6 }, () => pay(code, 40_000, { lines: [{ kind: "SERVICE", name: "x", qty: 1, price: 40_000 }] })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(2); // 100,000 / 40,000
    expect(await balanceOf(code)).toBe(20_000);
    await pay(code, 20_000, { lines: [{ kind: "SERVICE", name: "x", qty: 1, price: 20_000 }] });
    expect(await balanceOf(code)).toBe(0);
    const used = await pay(code, 1000);
    expect(used.status).toBe(409);
    expect(used.body.error.code).toBe("GIFT_CARD_USED");
    expect((await call(A, "GET", "/giftcards?status=USED")).body.data).toHaveLength(1);
  });
});

describe("refunds, voids, throttling, isolation", () => {
  it("voiding an invoice paid with a card gives the value back (and reactivates a used card)", async () => {
    const code = (await issue({ amount: 200_000 })).body.data.code;
    const s = await pay(code, 200_000, { lines: [{ kind: "SERVICE", name: "x", qty: 1, price: 200_000 }] });
    expect(await balanceOf(code)).toBe(0);
    expect((await call(A, "POST", `/cashier/sales/${s.body.data.id}/void`, { reason: "اشتباه" })).status).toBe(200);
    expect(await balanceOf(code)).toBe(200_000);
    expect((await call(A, "POST", `/cashier/sales/${s.body.data.id}/void`, { reason: "دوباره" })).status).toBe(409);
    expect(await balanceOf(code)).toBe(200_000);
    const id = (await call(A, "GET", "/giftcards")).body.data.find((g: { amount: number; balance: number }) => g.amount === 200_000).id;
    expect((await call(A, "GET", `/giftcards/${id}/history`)).body.data.map((t: { kind: string }) => t.kind)).toEqual(["ISSUE", "SPEND", "REFUND"]);
  });
  it("voiding the invoice that SOLD an untouched card voids the card; once spent, it can't be voided", async () => {
    const fresh = await issue({ amount: 300_000, payments: [{ method: "CASH", amount: 300_000 }] });
    expect((await call(A, "POST", `/cashier/sales/${await saleIdOf(fresh.body.data.id)}/void`, { reason: "برگشت" })).status).toBe(200);
    expect((await pay(fresh.body.data.code, 1000)).status).toBe(409);
    expect((await call(A, "GET", "/giftcards?status=VOID")).body.data).toHaveLength(1);

    const spent = await issue({ amount: 300_000, payments: [{ method: "CASH", amount: 300_000 }] });
    await pay(spent.body.data.code, 50_000, { lines: [{ kind: "SERVICE", name: "x", qty: 1, price: 50_000 }] });
    const blocked = await call(A, "POST", `/cashier/sales/${await saleIdOf(spent.body.data.id)}/void`, { reason: "تقلب" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("GIFT_CARD_SPENT");
    expect(await balanceOf(spent.body.data.code)).toBe(250_000);
  });
  it("throttles code probing", async () => {
    let last = 0;
    for (let i = 0; i < 70; i++) last = (await call(AS, "POST", "/giftcards/lookup", { code: `AAAA-BBBB-${String(1000 + i)}` })).status;
    expect(last).toBe(429);
  });
  it("another salon can't read or spend this salon's cards", async () => {
    const code = (await issue()).body.data.code;
    expect((await call(B, "POST", "/giftcards/lookup", { code })).status).toBe(404);
    expect((await pay(code, 1000, {}, B)).status).toBe(409);
    expect((await call(B, "GET", "/giftcards")).body.data).toHaveLength(0);
    expect((await call(B, "GET", `/giftcards/${(await call(A, "GET", "/giftcards")).body.data[0].id}/history`)).status).toBe(404);
  });
  it("spending needs the module: a salon that uninstalled it can't pay with a card", async () => {
    await call(B, "POST", "/tenant/modules/giftcards/uninstall", {});
    expect((await pay("AAAA-BBBB-CCCC", 1000, {}, B)).status).toBe(403);
  });
  it("overview totals sold, issued and what is still owed", async () => {
    const o = (await call(A, "GET", "/giftcards/overview")).body.data;
    expect(o.issued).toBeGreaterThan(3);
    expect(o.outstanding).toBeGreaterThan(0);
  });
});

async function saleIdOf(cardId: string) { return (await prisma.giftCard.findUniqueOrThrow({ where: { id: cardId } })).saleId!; }
