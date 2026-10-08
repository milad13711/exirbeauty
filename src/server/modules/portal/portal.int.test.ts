// Integration (seeded DB): customer sign-in scoped to one salon, registration, role isolation from staff routes, appointments & cancellation, shared module data.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setSmsGateway } from "../../platform/sms";
import { addDays, tehranNow, weekdayOf } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const raw = async (cookie: string | null, method: string, path: string, body?: unknown) => {
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null, setCookie: r.headers.get("set-cookie") };
};
const staff = async (who: Who, method: string, path: string, body?: unknown) => raw(`exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}`, method, path, body);

const T: Record<string, string> = {}, SLUG: Record<string, string> = {};
let A: Who, B: Who;
let sms: { to: string; text: string }[] = [];
const lastCode = () => /(\d{6})/.exec(sms.at(-1)!.text)![1];
const nextOpenDay = (n: number) => { let d = addDays(tehranNow().date, n); while (weekdayOf(d) === 6) d = addDays(d, 1); return d; };
let staffId: string, svcId: string;

/** Signs a customer in through the real flow and returns their cookie. */
async function login(slug: string, phone: string, name?: string) {
  resetRateLimits();
  await prisma.otpCode.deleteMany({ where: { phone: { startsWith: "c:" } } }); // clears the 60s resend cooldown between logins
  expect((await raw(null, "POST", `/portal/${slug}/otp/request`, { phone })).status).toBe(200);
  const r = await raw(null, "POST", `/portal/${slug}/otp/verify`, { phone, code: lastCode(), ...(name ? { name } : {}) });
  expect(r.status).toBe(200);
  return r.setCookie!.split(";")[0];
}

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `por-${k}`, slug: `por-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
    SLUG[k] = `por-${k}-${stamp}`;
  }
  A = { role: "OWNER", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b };
  for (const w of [A, B]) for (const m of ["customers", "staff", "services", "calendar", "portal"]) expect((await staff(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  staffId = (await staff(A, "POST", "/staff", { name: "مریم" })).body.data.id;
  svcId = (await staff(A, "POST", "/services", { category: "مو", name: "رنگ", price: 500_000, durationMin: 60, staffIds: [staffId] })).body.data.id;
});
afterAll(async () => {
  setSmsGateway(null);
  const tenants = [T.a, T.b];
  await prisma.otpCode.deleteMany({ where: { phone: { startsWith: "c:" } } });
  await prisma.referralReward.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.referralLink.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.referralConfig.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.loyaltyAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => { resetRateLimits(); sms = []; setSmsGateway({ send: async (to, text) => { sms.push({ to, text }); } }); });

describe("signing in", () => {
  it("is scoped to a salon that offers the portal; unknown or disabled salons look the same", async () => {
    expect((await raw(null, "POST", "/portal/no-such-salon/otp/request", { phone: "09211110001" })).status).toBe(404);
    await staff(B, "POST", "/tenant/modules/portal/uninstall", {});
    expect((await raw(null, "POST", `/portal/${SLUG.b}/otp/request`, { phone: "09211110001" })).status).toBe(404);
    expect(sms).toHaveLength(0);
    await staff(B, "POST", "/tenant/modules/portal/install", {});
  });
  it("sends a salon-branded code, rejects a bad phone, and throttles", async () => {
    expect((await raw(null, "POST", `/portal/${SLUG.a}/otp/request`, { phone: "123" })).status).toBe(422);
    expect((await raw(null, "POST", `/portal/${SLUG.a}/otp/request`, { phone: "09211110001" })).status).toBe(200);
    expect(sms[0].text).toContain("por-a");
    expect((await raw(null, "POST", `/portal/${SLUG.a}/otp/request`, { phone: "09211110001" })).status).toBe(429); // resend cooldown
  });
  it("a first-time customer must give a name — checked after the code, without spending it — and is registered", async () => {
    await raw(null, "POST", `/portal/${SLUG.a}/otp/request`, { phone: "09211110002" });
    const code = lastCode();
    expect((await raw(null, "POST", `/portal/${SLUG.a}/otp/verify`, { phone: "09211110002", code: "000000" })).status).toBe(401); // wrong code: no hint whether the phone is known
    const need = await raw(null, "POST", `/portal/${SLUG.a}/otp/verify`, { phone: "09211110002", code });
    expect(need.status).toBe(422);
    expect(need.body.error.code).toBe("NAME_REQUIRED");
    const ok = await raw(null, "POST", `/portal/${SLUG.a}/otp/verify`, { phone: "09211110002", code, name: "نیلوفر صادقی" });
    expect(ok.status).toBe(200);
    expect(ok.setCookie).toContain("HttpOnly");
    expect(await prisma.customer.count({ where: { tenantId: T.a, phone: "09211110002" } })).toBe(1);
    expect((await raw(null, "POST", `/portal/${SLUG.a}/otp/verify`, { phone: "09211110002", code, name: "نیلوفر صادقی" })).status).toBe(401); // single use
  });
  it("a returning customer signs straight in as their existing record", async () => {
    const existing = (await staff(A, "POST", "/customers", { name: "سارا محمدی", phone: "09211110003" })).body.data.id;
    const cookie = await login(SLUG.a, "09211110003");
    const me = await raw(cookie, "GET", "/portal/me");
    expect(me.body.data).toMatchObject({ id: existing, name: "سارا محمدی", salon: { name: "por-a" }, features: { booking: true, loyalty: false } });
    expect(await prisma.customer.count({ where: { tenantId: T.a, phone: "09211110003" } })).toBe(1);
  });
  it("a code is useless at another salon", async () => {
    await raw(null, "POST", `/portal/${SLUG.a}/otp/request`, { phone: "09211110004" });
    expect((await raw(null, "POST", `/portal/${SLUG.b}/otp/verify`, { phone: "09211110004", code: lastCode(), name: "فرد دیگر" })).status).toBe(401);
  });
});

describe("a customer is not staff", () => {
  it("can't reach any staff-side route, and anonymous gets 401", async () => {
    const cookie = await login(SLUG.a, "09211110003");
    for (const [m, p] of [["GET", "/customers"], ["GET", "/tenant/modules"], ["GET", "/tenant"], ["GET", "/auth/me"], ["GET", "/calendar/appointments"], ["GET", "/cashier/summary?from=2030-01-01"], ["GET", "/sms/account"], ["POST", "/auth/logout"], ["GET", "/tenant/users"]]) {
      expect((await raw(cookie, m, p)).status, `${m} ${p}`).toBe(403);
    }
    expect((await raw(null, "GET", "/portal/me")).status).toBe(401);
    expect((await staff(A, "GET", "/portal/me")).status).toBe(403); // and staff aren't customers
  });
  it("logging out clears the cookie", async () => {
    const cookie = await login(SLUG.a, "09211110003");
    expect((await raw(cookie, "POST", "/portal/logout")).setCookie).toContain("Max-Age=0");
  });
  it("an archived customer loses access immediately", async () => {
    const cookie = await login(SLUG.a, "09211110002");
    await prisma.customer.updateMany({ where: { tenantId: T.a, phone: "09211110002" }, data: { archivedAt: new Date() } });
    expect((await raw(cookie, "GET", "/portal/me")).status).toBe(401);
    await prisma.customer.updateMany({ where: { tenantId: T.a, phone: "09211110002" }, data: { archivedAt: null } });
  });
  it("the module going away shuts the portal", async () => {
    const cookie = await login(SLUG.b, "09211110009", "مشتری ب");
    expect((await raw(cookie, "GET", "/portal/me")).status).toBe(200);
    await staff(B, "POST", "/tenant/modules/portal/uninstall", {});
    expect((await raw(cookie, "GET", "/portal/me")).status).toBe(403);
    await staff(B, "POST", "/tenant/modules/portal/install", {});
  });
});

describe("appointments", () => {
  let cookie: string, cust: string, apptId: string;
  beforeAll(async () => {
    resetRateLimits(); sms = []; setSmsGateway({ send: async (to, text) => { sms.push({ to, text }); } });
    cookie = await login(SLUG.a, "09211110003");
    cust = (await raw(cookie, "GET", "/portal/me")).body.data.id;
    apptId = (await staff(A, "POST", "/calendar/appointments", { customerId: cust, staffId, serviceId: svcId, date: nextOpenDay(3), startMin: 600 })).body.data.id;
  });
  it("lists only the customer's own appointments, with whether they can still cancel", async () => {
    const other = (await staff(A, "POST", "/customers", { name: "دیگری", phone: "09211110007" })).body.data.id;
    await staff(A, "POST", "/calendar/appointments", { customerId: other, staffId, serviceId: svcId, date: nextOpenDay(3), startMin: 780 });
    const r = (await raw(cookie, "GET", "/portal/appointments")).body.data;
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ id: apptId, serviceName: "رنگ", staffName: "مریم", upcoming: true, canCancel: true });
  });
  it("cancels in time (the salon sees it canceled), refuses a second time, and can't touch others' appointments", async () => {
    const otherAppt = (await prisma.appointment.findFirstOrThrow({ where: { tenantId: T.a, customerId: { not: cust } } })).id;
    expect((await raw(cookie, "POST", `/portal/appointments/${otherAppt}/cancel`)).status).toBe(404);
    expect((await raw(cookie, "POST", `/portal/appointments/${apptId}/cancel`)).status).toBe(200);
    expect((await staff(A, "GET", `/calendar/appointments/${apptId}`)).body.data).toMatchObject({ status: "CANCELED", cancelReason: "لغو توسط مشتری" });
    expect((await raw(cookie, "POST", `/portal/appointments/${apptId}/cancel`)).status).toBe(409);
  });
  it("refuses a cancellation inside the salon's notice window", async () => {
    await staff(A, "PUT", "/calendar/settings", { cancelHours: 24 * 7 });
    const near = (await staff(A, "POST", "/calendar/appointments", { customerId: cust, staffId, serviceId: svcId, date: nextOpenDay(4), startMin: 660 })).body.data.id;
    const r = await raw(cookie, "POST", `/portal/appointments/${near}/cancel`);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("TOO_LATE");
    await staff(A, "PUT", "/calendar/settings", { cancelHours: 12 });
  });
  it("updates only name and birth date", async () => {
    const r = await raw(cookie, "PATCH", "/portal/me", { name: "سارا محمدی‌نژاد", birthDate: "1990-03-04", phone: "09999999999", tenantId: "x" });
    expect(r.body.data).toMatchObject({ name: "سارا محمدی‌نژاد", birthDate: "1990-03-04", phone: "09211110003" });
    expect((await raw(cookie, "PATCH", "/portal/me", {})).status).toBe(422);
  });
});

describe("club data", () => {
  it("rewards, wallet, invite and membership appear only when the salon runs those modules", async () => {
    const cookie = await login(SLUG.a, "09211110003");
    for (const p of ["rewards", "wallet", "invite", "membership"]) expect((await raw(cookie, "GET", `/portal/${p}`)).status, p).toBe(404);
    for (const m of ["cashier", "loyalty", "referral", "memberships"]) expect((await staff(A, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
    const me = (await raw(cookie, "GET", "/portal/me")).body.data;
    expect(me.features).toMatchObject({ loyalty: true, referral: true, memberships: true });
    const cust = me.id;
    await staff(A, "POST", `/loyalty/customers/${cust}/adjust`, { points: 600, wallet: 40_000, note: "هدیه" });
    const rw = (await raw(cookie, "GET", "/portal/rewards")).body.data;
    expect(rw).toMatchObject({ points: 600, tier: "نقره‌ای" });
    expect(rw.rewards.length).toBeGreaterThan(0);
    expect((await raw(cookie, "GET", "/portal/wallet")).body.data).toMatchObject({ balance: 40_000 });
    // wallet rewards can be claimed by the customer; vouchers only at the salon
    const red = await raw(cookie, "POST", "/portal/rewards/w1/redeem");
    expect(red.body.data).toMatchObject({ points: 100, wallet: 90_000 });
    expect((await raw(cookie, "POST", "/portal/rewards/w1/redeem")).status).toBe(409); // not enough points left
    expect((await raw(cookie, "POST", "/portal/rewards/w3/redeem")).body.error.code).toBe("AT_SALON");
    expect((await raw(cookie, "POST", "/portal/rewards/nope/redeem")).status).toBe(404);
    await staff(A, "POST", `/loyalty/customers/${cust}/adjust`, { points: 500, wallet: -50_000, note: "برگرداندن" });
    await staff(A, "PUT", "/referral/config", { enabled: true, referrerPts: 100, friendOff: 10 });
    const inv = (await raw(cookie, "GET", "/portal/invite")).body.data;
    expect(inv.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(inv.path).toBe(`/s/${SLUG.a}?ref=${inv.code}`);
    expect((await raw(cookie, "GET", "/portal/membership")).body.data).toMatchObject({ membership: null });
  });
  it("a friend registering through the invite code is attached to the referrer", async () => {
    const owner = await login(SLUG.a, "09211110003");
    const code = (await raw(owner, "GET", "/portal/invite")).body.data.code;
    resetRateLimits(); sms = [];
    await raw(null, "POST", `/portal/${SLUG.a}/otp/request`, { phone: "09211110050" });
    expect((await raw(null, "POST", `/portal/${SLUG.a}/otp/verify`, { phone: "09211110050", code: lastCode(), name: "دوست جدید", ref: code })).status).toBe(200);
    const friend = await prisma.customer.findFirstOrThrow({ where: { tenantId: T.a, phone: "09211110050" } });
    expect(friend.referredById).toBe((await raw(owner, "GET", "/portal/me")).body.data.id);
  });
});
