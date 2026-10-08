// Integration (seeded DB): invite codes, attaching friends from the public booking, one-time points reward, guards, isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { addDays, tehranNow, weekdayOf } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {}, S: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who;
let staffId: string, svcId: string, ref: string, refB: string;
const nextOpenDay = (n: number) => { let d = addDays(tehranNow().date, n); while (weekdayOf(d) === 6) d = addDays(d, 1); return d; };
let slot = 0;
const book = (slug: string, name: string, phone: string, code?: string, svc = svcId) =>
  call(null, "POST", `/public/salons/${slug}/appointments`, { serviceId: svc, date: nextOpenDay(4 + Math.floor(slot / 6)), startMin: 540 + 60 * (slot++ % 6), name, phone, ...(code ? { ref: code } : {}) });
const state = async (id: string, w = A) => (await call(w, "GET", `/referral/customers/${id}`)).body.data;
const points = async (id: string) => (await call(A, "GET", `/loyalty/customers/${id}`)).body.data.points as number;
const invoice = (customerId: string, w = A) => call(w, "POST", "/cashier/sales", { customerId, lines: [{ kind: "SERVICE", refId: svcId, name: "رنگ", qty: 1, price: 500_000, staffId }], payments: [{ method: "CASH", amount: 500_000 }] });
const idByPhone = async (phone: string, tenantId = T.a) => (await prisma.customer.findFirstOrThrow({ where: { tenantId, phone } })).id;

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `ref-${k}`, slug: `ref-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
    S[k] = `ref-${k}-${stamp}`;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["customers", "staff", "services", "calendar", "cashier", "loyalty", "referral"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  staffId = (await call(A, "POST", "/staff", { name: "مریم" })).body.data.id;
  svcId = (await call(A, "POST", "/services", { category: "مو", name: "رنگ", price: 500_000, durationMin: 60, staffIds: [staffId] })).body.data.id;
  S.r = (await call(A, "POST", "/customers", { name: "سارا معرف", phone: "09181110001" })).body.data.id;
  S.old = (await call(A, "POST", "/customers", { name: "قدیمی", phone: "09181110002" })).body.data.id;
  await invoice(S.old); // already a customer with history
  // salon B has its own staff/service/customer for the cross-salon code check
  const bs = (await call(B, "POST", "/staff", { name: "نگار" })).body.data.id;
  S.bsvc = (await call(B, "POST", "/services", { category: "مو", name: "رنگ", price: 1000, durationMin: 60, staffIds: [bs] })).body.data.id;
  S.bcust = (await call(B, "POST", "/customers", { name: "معرف ب", phone: "09181110099" })).body.data.id;
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.referralReward.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.referralLink.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.referralConfig.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyConfig.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "referral." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => resetRateLimits());

describe("access & config", () => {
  it("is gated by plan and role; the program starts off", async () => {
    expect((await call(FREE, "GET", "/referral/config")).status).toBe(403);
    expect((await call(null, "GET", "/referral/config")).status).toBe(401);
    expect((await call(AS, "PUT", "/referral/config", { enabled: true, referrerPts: 1, friendOff: 1 })).status).toBe(403);
    expect((await call(AS, "GET", "/referral/overview")).status).toBe(403);
    expect((await call(A, "GET", "/referral/config")).body.data).toEqual({ enabled: false, referrerPts: 100, friendOff: 10 });
    expect((await call(A, "PUT", "/referral/config", { enabled: true, referrerPts: 100, friendOff: 99 })).status).toBe(422);
  });
  it("hands out one stable code per customer", async () => {
    ref = (await state(S.r)).code;
    expect(ref).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect((await state(S.r)).code).toBe(ref);
    refB = (await state(S.bcust, B)).code;
    expect(refB).not.toBe(ref);
    expect((await call(A, "GET", `/referral/customers/${S.bcust}`)).status).toBe(404);
  });
});

describe("attaching and rewarding", () => {
  it("ignores an invite code while the program is off", async () => {
    expect((await book(S.a, "دوست اول", "09181110010", ref)).status).toBe(200);
    expect((await state(await idByPhone("09181110010"))).referredBy).toBeNull();
    await prisma.customer.update({ where: { id: await idByPhone("09181110010") }, data: { referredById: null } });
  });
  it("attaches a brand-new friend who books through the link", async () => {
    await call(A, "PUT", "/referral/config", { enabled: true, referrerPts: 100, friendOff: 10 });
    expect((await book(S.a, "دوست دوم", "09181110011", ref.toLowerCase())).status).toBe(200); // codes are case-insensitive
    S.f = await idByPhone("09181110011");
    const f = await state(S.f);
    expect(f.referredBy).toMatchObject({ id: S.r, name: "سارا معرف" });
    expect(f.friendOffer).toBe(10);
    expect((await state(S.r)).friends).toBe(1);
  });
  it("refuses self-referral, existing customers, unknown codes and other salons' codes", async () => {
    await book(S.a, "سارا معرف", "09181110001", ref);
    expect((await state(S.r)).referredBy).toBeNull();
    await book(S.a, "قدیمی", "09181110002", ref);
    expect((await state(S.old)).referredBy).toBeNull();
    await book(S.a, "ناشناس کد", "09181110012", "ZZZZZZ");
    expect((await state(await idByPhone("09181110012"))).referredBy).toBeNull();
    await book(S.a, "کد سالن دیگر", "09181110013", refB);
    expect((await state(await idByPhone("09181110013"))).referredBy).toBeNull();
  });
  it("won't re-point a friend who already has a referrer", async () => {
    const other = (await call(A, "POST", "/customers", { name: "معرف دوم", phone: "09181110020" })).body.data.id;
    const otherCode = (await state(other)).code;
    await book(S.a, "دوست دوم", "09181110011", otherCode);
    expect((await state(S.f)).referredBy.id).toBe(S.r);
  });
  it("rewards the referrer once, on the friend's first invoice — never again", async () => {
    const before = await points(S.r);
    expect((await invoice(S.f)).status).toBe(200);
    expect(await points(S.r)).toBe(before + 100);
    expect((await state(S.f)).friendOffer).toBe(0);
    expect((await state(S.r))).toMatchObject({ rewardedFriends: 1, pointsEarned: 100 });
    await invoice(S.f);
    expect(await points(S.r)).toBe(before + 100);
    const tx = (await call(A, "GET", `/loyalty/customers/${S.r}`)).body.data.log;
    expect(tx.filter((l: { kind: string }) => l.kind === "REFERRAL")).toHaveLength(1);
  });
  it("no reward when the program is off at invoice time", async () => {
    await call(A, "PUT", "/referral/config", { enabled: true, referrerPts: 100, friendOff: 10 });
    await book(S.a, "دوست سوم", "09181110014", ref);
    const f3 = await idByPhone("09181110014");
    await call(A, "PUT", "/referral/config", { enabled: false, referrerPts: 100, friendOff: 10 });
    const before = await points(S.r);
    await invoice(f3);
    expect(await points(S.r)).toBe(before);
    await call(A, "PUT", "/referral/config", { enabled: true, referrerPts: 100, friendOff: 10 });
  });
});

describe("overview & isolation", () => {
  it("lists referred friends, conversions and top referrers", async () => {
    const o = (await call(A, "GET", "/referral/overview")).body.data;
    expect(o.referred).toBeGreaterThanOrEqual(2);
    expect(o.converted).toBe(1);
    expect(o.top[0]).toMatchObject({ name: "سارا معرف", rewarded: 1 });
    expect(o.rows.find((r: { friend: string }) => r.friend === "دوست دوم")).toMatchObject({ rewarded: true, points: 100 });
  });
  it("another salon sees nothing of it", async () => {
    expect((await call(B, "GET", "/referral/overview")).body.data).toMatchObject({ referred: 0, converted: 0 });
  });
});
