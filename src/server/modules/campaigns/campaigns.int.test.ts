// Integration (seeded DB): audience rules, cost preview, credit check, sending, frequency cap, scheduling, attribution, isolation, roles.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setSmsGateway } from "../../platform/sms";
import { addDays, tehranNow } from "../calendar/availability";
import { runScheduled } from "./service";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};

const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;
let sent: { to: string; text: string }[] = [];
const C: Record<string, string> = {};
const MSG = "{name} جان، دلتنگت شدیم؛ یک پیشنهاد ویژه داریم.";
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const credit = (tenantId: string, delta: number) => call(ADMIN, "POST", "/admin/sms/adjust", { tenantId, delta, note: "test" });
const balance = async () => (await call(A, "GET", "/sms/account")).body.data.balance as number;

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `cmp-${k}`, slug: `cmp-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free }; ADMIN = { role: "SUPER_ADMIN", tenantId: null };
  for (const w of [A, B]) for (const m of ["customers", "sms", "campaigns", "cashier"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  const mk = async (k: string, name: string, phone: string, extra: Record<string, unknown> = {}) => (C[k] = (await call(A, "POST", "/customers", { name, phone, ...extra })).body.data.id);
  await mk("old", "سارا محمدی", "09161110001"); await mk("recent", "نیلوفر صادقی", "09161110002"); await mk("never", "مینا رضایی", "09161110003");
  await prisma.customerVisit.create({ data: { tenantId: T.a, customerId: C.old, at: daysAgo(90), service: "رنگ", category: "", staffName: "", price: 1_000_000 } });
  await prisma.customerVisit.create({ data: { tenantId: T.a, customerId: C.recent, at: daysAgo(5), service: "فیشال", category: "", staffName: "", price: 500_000 } });
  C.b = (await call(B, "POST", "/customers", { name: "مشتری ب", phone: "09161110009" })).body.data.id;
  await prisma.customerVisit.create({ data: { tenantId: T.b, customerId: C.b, at: daysAgo(100), service: "رنگ", category: "", staffName: "", price: 1 } });
  await prisma.platformSetting.deleteMany({ where: { key: "sms.pricing" } });
});
afterAll(async () => {
  setSmsGateway(null);
  const tenants = [T.a, T.b, T.free];
  await prisma.campaign.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsMessage.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customerVisit.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "campaign." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => { resetRateLimits(); sent = []; setSmsGateway({ send: async (to, text) => { sent.push({ to, text }); } }); });

describe("access & validation", () => {
  it("is gated by plan/install and owner-only", async () => {
    expect((await call(FREE, "GET", "/campaigns")).status).toBe(403);
    expect((await call(null, "GET", "/campaigns")).status).toBe(401);
    expect((await call(AS, "GET", "/campaigns")).status).toBe(403);
    expect((await call(AS, "POST", "/campaigns", { name: "x", message: MSG, segment: { inactiveDays: 30 } })).status).toBe(403);
  });
  it("needs a name, a real message and at least one audience rule", async () => {
    expect((await call(A, "POST", "/campaigns", { name: "ab", message: MSG, segment: { inactiveDays: 30 } })).status).toBe(422);
    expect((await call(A, "POST", "/campaigns", { name: "بازگشت", message: "کوتاه", segment: { inactiveDays: 30 } })).status).toBe(422);
    expect((await call(A, "POST", "/campaigns", { name: "بازگشت", message: MSG, segment: {} })).status).toBe(400);
    expect((await call(A, "POST", "/campaigns/preview", { message: MSG, segment: { tiers: ["VIP"] } })).status).toBe(400); // tiers need the loyalty module
  });
});

describe("preview", () => {
  it("counts the audience, prices it and shows whether credit covers it", async () => {
    const p = (await call(A, "POST", "/campaigns/preview", { message: MSG, segment: { inactiveDays: 45 } })).body.data;
    expect(p).toMatchObject({ count: 1, sample: ["سارا محمدی"], cost: 190, balance: 0, enough: false });
    expect(p.text).toContain("سارا جان");
    expect((await call(A, "POST", "/campaigns/preview", { message: MSG, segment: { service: "فیشال" } })).body.data.sample).toEqual(["نیلوفر صادقی"]);
    expect((await call(A, "POST", "/campaigns/preview", { message: MSG, segment: { minSpend: 1 } })).body.data.count).toBe(0);
  });
});

describe("sending", () => {
  it("refuses without enough credit (nothing sent or charged)", async () => {
    const r = await call(A, "POST", "/campaigns", { name: "بازگشت", message: MSG, segment: { inactiveDays: 45 } });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("NO_CREDIT");
    expect(sent).toHaveLength(0);
  });
  it("sends to exactly the audience, personalised, charging per part; refuses an empty audience", async () => {
    await credit(T.a, 10_000);
    const r = await call(A, "POST", "/campaigns", { name: "بازگشت مشتریان", message: MSG, segment: { inactiveDays: 45 } });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: "SENT", audienceCount: 1, sentCount: 1, failedCount: 0 });
    expect(sent).toEqual([{ to: "09161110001", text: "سارا جان، دلتنگت شدیم؛ یک پیشنهاد ویژه داریم." }]);
    expect(await balance()).toBe(10_000 - 190);
    expect((await call(A, "POST", "/campaigns", { name: "هیچ‌کس", message: MSG, segment: { minSpend: 999_999_999 } })).status).toBe(400);
  });
  it("won't message the same customer more than twice in 30 days", async () => {
    await call(A, "POST", "/campaigns", { name: "دوم", message: MSG, segment: { inactiveDays: 45 } });
    const third = await call(A, "POST", "/campaigns", { name: "سوم", message: MSG, segment: { inactiveDays: 45 } });
    expect(third.body.data).toMatchObject({ sentCount: 0, skippedCount: 1 });
    expect(sent).toHaveLength(1); // only the second one went out
  });
  it("attributes later sales of recipients to the campaign", async () => {
    await call(A, "POST", "/cashier/sales", { customerId: C.old, lines: [{ kind: "SERVICE", name: "رنگ", qty: 1, price: 800_000 }], payments: [{ method: "CASH", amount: 800_000 }] });
    const list = (await call(A, "GET", "/campaigns")).body.data as { name: string; revenue: number; buyers: number }[];
    const first = list.find((c) => c.name === "بازگشت مشتریان")!;
    expect(first).toMatchObject({ revenue: 800_000, buyers: 1 });
  });
});

describe("scheduling", () => {
  it("schedules for the future only, can be canceled, and the cron sends due ones once", async () => {
    await credit(T.a, 5000);
    const now = tehranNow();
    expect((await call(A, "POST", "/campaigns", { name: "گذشته", message: MSG, segment: { service: "فیشال" }, sendAt: { date: addDays(now.date, -1), minute: 600 } })).status).toBe(400);
    expect((await call(A, "POST", "/campaigns", { name: "خیلی دور", message: MSG, segment: { service: "فیشال" }, sendAt: { date: addDays(now.date, 90), minute: 600 } })).status).toBe(400);

    const mk = async (name: string) => (await call(A, "POST", "/campaigns", { name, message: MSG, segment: { service: "فیشال" }, sendAt: { date: addDays(now.date, 2), minute: 600 } })).body.data;
    const keep = await mk("زمان‌بندی"), drop = await mk("لغوشدنی");
    expect(keep.status).toBe("SCHEDULED");
    expect(sent).toHaveLength(0);
    expect((await call(A, "DELETE", `/campaigns/${drop.id}`)).status).toBe(200);
    expect((await call(A, "DELETE", `/campaigns/${drop.id}`)).status).toBe(409);
    expect((await call(B, "DELETE", `/campaigns/${keep.id}`)).status).toBe(404);

    expect(await runScheduled(new Date())).toEqual({ sent: 0, failed: 0 }); // not due yet
    const later = new Date(Date.now() + 3 * 86_400_000);
    const [r1, r2] = await Promise.all([runScheduled(later), runScheduled(later)]);
    expect(r1.sent + r2.sent).toBe(1); // overlapping runs never send twice
    expect(sent).toHaveLength(1);
    expect((await call(A, "GET", "/campaigns")).body.data.find((c: { id: string }) => c.id === keep.id)).toMatchObject({ status: "SENT", sentCount: 1 });
    expect((await call(A, "GET", "/campaigns")).body.data.find((c: { id: string }) => c.id === drop.id).status).toBe("CANCELED");
  });
  it("the cron endpoint needs the shared secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call(null, "POST", "/campaigns/cron/run")).status).toBe(403);
    expect((await call(null, "POST", "/campaigns/cron/run", undefined, { "x-cron-secret": "s3cret" })).status).toBe(200);
    delete process.env.CRON_SECRET;
    expect((await call(null, "POST", "/campaigns/cron/run", undefined, { "x-cron-secret": "" })).status).toBe(403);
  });
});

describe("isolation", () => {
  it("never reaches another salon's customers or shows its campaigns", async () => {
    const p = (await call(B, "POST", "/campaigns/preview", { message: MSG, segment: { inactiveDays: 45 } })).body.data;
    expect(p.sample).toEqual(["مشتری ب"]);
    expect((await call(B, "GET", "/campaigns")).body.data).toHaveLength(0);
  });
});
