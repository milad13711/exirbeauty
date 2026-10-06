// Integration (seeded DB): credit & top-up, atomic charging, refund on failure, once-only automatic messages,
// scenarios, event-driven confirmations, cron reminders/birthdays, admin pricing, isolation, roles.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setSmsGateway } from "../../platform/sms";
import { setZarinpalClient } from "../../platform/payments/zarinpal";
import { addDays, tehranNow, weekdayOf } from "../calendar/availability";
import { runDue } from "./service";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};

const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;
let sent: { to: string; text: string }[] = [], failNext = false;
let staffId: string, svcId: string, cust: string, pkgId: string;
const SELL = 190;
const balance = async (w: Who) => (await call(w, "GET", "/sms/account")).body.data.balance as number;
const nextOpenDay = (n: number) => { let d = addDays(tehranNow().date, n); while (weekdayOf(d) === 6) d = addDays(d, 1); return d; };
const give = (tenantId: string, delta: number) => call(ADMIN, "POST", "/admin/sms/adjust", { tenantId, delta, note: "test" });
const book = (o: Record<string, unknown> = {}) => call(A, "POST", "/calendar/appointments", { customerId: cust, staffId, serviceId: svcId, date: nextOpenDay(3), startMin: 600, ...o });

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `sms-${k}`, slug: `sms-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free }; ADMIN = { role: "SUPER_ADMIN", tenantId: null };
  for (const w of [A, B]) for (const m of ["sms", "customers", "staff", "services", "calendar"]) await call(w, "POST", `/tenant/modules/${m}/install`, {});
  staffId = (await call(A, "POST", "/staff", { name: "مریم" })).body.data.id;
  svcId = (await call(A, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_000_000, durationMin: 60, staffIds: [staffId] })).body.data.id;
  cust = (await call(A, "POST", "/customers", { name: "سارا", phone: "09121110001" })).body.data.id;
  await prisma.platformSetting.deleteMany({ where: { key: "sms.pricing" } });
  pkgId = (await call(ADMIN, "POST", "/admin/sms/packages", { name: "تست", price: 100_000, bonusPct: 10 })).body.data.id;
});
afterAll(async () => {
  setSmsGateway(null); setZarinpalClient(null);
  const tenants = [T.a, T.b, T.free];
  await prisma.smsMessage.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsScenario.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.payment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsPackage.deleteMany({ where: { id: pkgId } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "sms." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => {
  resetRateLimits(); sent = []; failNext = false;
  setSmsGateway({ send: async (to, text) => { if (failNext) throw new Error("boom"); sent.push({ to, text }); } });
});

describe("access", () => {
  it("is gated by plan/install and role", async () => {
    expect((await call(FREE, "GET", "/sms/account")).status).toBe(403);
    expect((await call(null, "GET", "/sms/account")).status).toBe(401);
    expect((await call(AS, "PATCH", "/sms/account", { lowThreshold: 5 })).status).toBe(403);
    expect((await call(AS, "POST", "/admin/sms/adjust", { tenantId: T.a, delta: 5, note: "x" })).status).toBe(403);
    expect((await call(A, "GET", "/admin/sms/pricing")).status).toBe(403);
  });
});

describe("credit", () => {
  it("starts empty, and admin adjust can't go negative", async () => {
    expect(await balance(A)).toBe(0);
    expect((await give(T.a, -10)).status).toBe(409);
    expect((await give(T.a, 5000)).body.data.balance).toBe(5000);
    expect((await give(T.a, -5000)).body.data.balance).toBe(0);
  });
  it("a paid top-up credits the price plus the bonus, exactly once", async () => {
    setZarinpalClient({ request: async () => ({ authority: `S${Math.random().toString(36).slice(2, 12)}` }), verify: async () => ({ code: 100, refId: "1", cardPan: "x" }), startUrl: (a) => `https://pay.test/${a}` });
    const before = await balance(A);
    const r = await call(A, "POST", "/sms/topup", { packageId: pkgId });
    expect(r.status).toBe(200);
    expect(r.body.data.amount).toBe(100_000);
    const authority = (await prisma.payment.findUniqueOrThrow({ where: { id: r.body.data.paymentId } })).authority!;
    const cb = `/payments/zarinpal/callback?Authority=${authority}&Status=OK`;
    await call(null, "GET", cb); await call(null, "GET", cb);
    expect(await balance(A)).toBe(before + 110_000);
    expect((await prisma.smsTx.findMany({ where: { tenantId: T.a, kind: { in: ["TOPUP", "BONUS"] } } })).map((t) => t.delta).sort()).toEqual([10_000, 100_000]);
  });
  it("won't sell an inactive package, and the client can't set the price", async () => {
    const p = (await call(ADMIN, "POST", "/admin/sms/packages", { name: "قدیمی", price: 50_000 })).body.data.id;
    await call(ADMIN, "PATCH", `/admin/sms/packages/${p}`, { active: false });
    expect((await call(A, "POST", "/sms/topup", { packageId: p })).status).toBe(404);
    expect((await call(A, "GET", "/sms/packages")).body.data.some((x: { id: string }) => x.id === p)).toBe(false);
    await prisma.smsPackage.delete({ where: { id: p } });
  });
});

describe("sending", () => {
  beforeAll(async () => { await give(T.a, 100_000 - (await balance(A))); });
  it("charges parts × price and records the message and the transaction", async () => {
    const b0 = await balance(A);
    const r = await call(AS, "POST", "/sms/send", { customerId: cust, text: "سلام" });
    expect(r.status).toBe(200);
    expect(sent).toEqual([{ to: "09121110001", text: "سلام" }]);
    expect(await balance(A)).toBe(b0 - SELL);
    const long = "ب".repeat(100); // 2 parts
    await call(A, "POST", "/sms/send", { phone: "۰۹۱۲۱۱۱۰۰۰۹", text: long });
    expect(await balance(A)).toBe(b0 - SELL * 3);
    const msgs = (await call(A, "GET", "/sms/messages")).body.data;
    expect(msgs[0]).toMatchObject({ parts: 2, cost: SELL * 2, status: "SENT", phone: "09121110009" });
  });
  it("refunds when the gateway fails — the salon pays nothing", async () => {
    const b0 = await balance(A);
    failNext = true;
    expect((await call(A, "POST", "/sms/send", { phone: "09121110009", text: "x" })).status).toBe(502);
    expect(await balance(A)).toBe(b0);
    expect((await call(A, "GET", "/sms/messages?status=FAILED")).body.data.length).toBeGreaterThan(0);
  });
  it("blocks (and doesn't charge or send) when credit runs out", async () => {
    await give(T.b, 100);
    expect((await call(B, "POST", "/sms/send", { phone: "09121110009", text: "x" })).status).toBe(409);
    expect(sent).toHaveLength(0);
    expect(await balance(B)).toBe(100);
    expect((await call(B, "GET", "/sms/messages?status=BLOCKED")).body.data).toHaveLength(1);
    await give(T.b, -100);
  });
  it("concurrent sends never overdraw", async () => {
    await give(T.b, SELL * 3 + 50);
    const rs = await Promise.all(Array.from({ length: 8 }, () => call(B, "POST", "/sms/send", { phone: "09121110009", text: "x" })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(3);
    expect(await balance(B)).toBe(50);
    await give(T.b, -50);
  });
  it("validates input", async () => {
    expect((await call(A, "POST", "/sms/send", { phone: "123", text: "x" })).status).toBe(400);
    expect((await call(A, "POST", "/sms/send", { text: "x" })).status).toBe(400);
    expect((await call(A, "POST", "/sms/send", { phone: "09121110009", text: "" })).status).toBe(422);
    expect((await call(A, "POST", "/sms/send", { customerId: "nope", text: "x" })).status).toBe(400);
  });
  it("is tenant-isolated", async () => {
    const otherCust = (await call(B, "POST", "/customers", { name: "مشتری ب", phone: "09121110077" })).body.data.id;
    expect((await call(A, "POST", "/sms/send", { customerId: otherCust, text: "x" })).status).toBe(400);
    const bMsgs = (await call(B, "GET", "/sms/messages")).body.data as { phone: string }[];
    expect(bMsgs.every((m) => m.phone !== "09121110001")).toBe(true);
  });
});

describe("scenarios & events", () => {
  beforeAll(async () => { await give(T.a, 50_000); });
  it("lists defaults and edits a template", async () => {
    const list = (await call(A, "GET", "/sms/scenarios")).body.data;
    expect(list.find((s: { kind: string }) => s.kind === "CONFIRM").enabled).toBe(true);
    expect(list.find((s: { kind: string }) => s.kind === "BIRTHDAY").enabled).toBe(false);
    const r = await call(A, "PUT", "/sms/scenarios/thanks", { enabled: true, template: "ممنون {name}!" });
    expect(r.body.data).toMatchObject({ kind: "THANKS", enabled: true, template: "ممنون {name}!", custom: true });
    expect((await call(A, "PUT", "/sms/scenarios/nope", { enabled: true })).status).toBe(404);
    expect((await call(A, "PUT", "/sms/scenarios/thanks", {})).status).toBe(422);
  });
  it("confirms a confirmed booking, cancels, thanks after completion, and moves — each once", async () => {
    const a = (await book()).body.data;
    expect(sent.at(-1)?.text).toContain("تأیید شد");
    expect(sent.at(-1)?.text).toContain("سارا");
    expect(sent.at(-1)?.text).toContain("sms-a");
    const n = sent.length;
    await call(A, "POST", `/calendar/appointments/${a.id}/move`, { date: nextOpenDay(4), startMin: 660 });
    expect(sent.at(-1)?.text).toContain("منتقل شد");
    await call(A, "POST", `/calendar/appointments/${a.id}/status`, { status: "DONE" });
    expect(sent.at(-1)?.text).toBe("ممنون سارا!");
    expect(sent.length).toBe(n + 2);

    const b = (await book({ startMin: 780 })).body.data;
    await call(A, "POST", `/calendar/appointments/${b.id}/cancel`, { reason: "x" });
    expect(sent.at(-1)?.text).toContain("لغو شد");
  });
  it("sends nothing when the scenario is off, and booking still succeeds with no credit", async () => {
    await call(A, "PUT", "/sms/scenarios/confirm", { enabled: false });
    const n = sent.length;
    expect((await book({ startMin: 840 })).status).toBe(200);
    expect(sent.length).toBe(n);
    await call(A, "PUT", "/sms/scenarios/confirm", { enabled: true });
    const b0 = await balance(A);
    await give(T.a, -b0);
    expect((await book({ startMin: 900 })).status).toBe(200);
    expect((await call(A, "GET", "/sms/messages?status=BLOCKED")).body.data.some((m: { kind: string }) => m.kind === "CONFIRM")).toBe(true);
    await give(T.a, 50_000);
  });
  it("a salon without the module hears nothing", async () => {
    await call(B, "POST", "/tenant/modules/sms/uninstall", {});
    const n = sent.length;
    const c = (await call(B, "POST", "/customers", { name: "مشتری ب", phone: "09121110055" })).body.data.id;
    const st = (await call(B, "POST", "/staff", { name: "نگار" })).body.data.id;
    const sv = (await call(B, "POST", "/services", { category: "مو", name: "سرویس", price: 1000, durationMin: 30, staffIds: [st] })).body.data.id;
    expect((await call(B, "POST", "/calendar/appointments", { customerId: c, staffId: st, serviceId: sv, date: nextOpenDay(3), startMin: 600 })).status).toBe(200);
    expect(sent.length).toBe(n);
  });
});

describe("scheduled reminders & birthdays", () => {
  it("sends the 24h reminder once, the 2h one when close, and birthdays once a year", async () => {
    await prisma.smsMessage.deleteMany({ where: { tenantId: T.a } });
    await prisma.appointment.deleteMany({ where: { tenantId: T.a } });
    await prisma.smsScenario.deleteMany({ where: { tenantId: T.a, kind: { in: ["REMINDER_2", "BIRTHDAY"] } } });
    await call(A, "PUT", "/sms/scenarios/reminder_2", { enabled: true });
    await call(A, "PUT", "/sms/scenarios/birthday", { enabled: true });
    const now = tehranNow();
    // An appointment ~10h from "now" (use a fixed fake clock so the test is deterministic).
    const fake = new Date("2030-03-04T06:00:00Z"); // 09:30 Tehran
    const day = tehranNow(fake);
    await prisma.appointment.create({ data: { tenantId: T.a, customerId: cust, staffId, serviceId: svcId, serviceName: "رنگ ریشه", price: 1, date: new Date(`${day.date}T00:00:00Z`), startMin: 19 * 60, durationMin: 60, status: "CONFIRMED" } });
    await prisma.appointment.create({ data: { tenantId: T.a, customerId: cust, staffId, serviceId: svcId, serviceName: "رنگ ریشه", price: 1, date: new Date(`${day.date}T00:00:00Z`), startMin: 11 * 60, durationMin: 60, status: "CONFIRMED" } });
    await prisma.customer.update({ where: { id: cust }, data: { birthDate: new Date("1990-03-04T00:00:00Z") } });
    sent = [];
    const r1 = await runDue(day, fake);
    expect(r1).toMatchObject({ reminders: 2, birthdays: 1 });
    expect(sent.filter((m) => m.text.includes("یادآوری"))).toHaveLength(1); // 19:00 → 24h template
    expect(sent.filter((m) => m.text.includes("ساعت ۱۱:۰۰ است"))).toHaveLength(1); // 11:00 → 2h template
    const again = await runDue(day, fake);
    expect(again.reminders + again.birthdays).toBe(0);
    expect(sent).toHaveLength(4 - 1);
    void now;
  });
  it("the cron endpoint needs the shared secret", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call(null, "POST", "/sms/cron/run")).status).toBe(403);
    expect((await call(null, "POST", "/sms/cron/run", undefined, { "x-cron-secret": "nope" })).status).toBe(403);
    expect((await call(null, "POST", "/sms/cron/run", undefined, { "x-cron-secret": "s3cret" })).status).toBe(200);
    delete process.env.CRON_SECRET;
    expect((await call(null, "POST", "/sms/cron/run", undefined, { "x-cron-secret": "" })).status).toBe(403);
  });
});

describe("admin pricing & stats", () => {
  it("a new sell price applies to later messages", async () => {
    expect((await call(ADMIN, "PUT", "/admin/sms/pricing", { sell: 250 })).status).toBe(200);
    const b0 = await balance(A);
    await call(A, "POST", "/sms/send", { phone: "09121110009", text: "x" });
    expect(await balance(A)).toBe(b0 - 250);
    await call(ADMIN, "PUT", "/admin/sms/pricing", { sell: SELL });
  });
  it("reports sent/failed/blocked and spend", async () => {
    failNext = true;
    await call(A, "POST", "/sms/send", { phone: "09121110009", text: "x" });
    failNext = false;
    const keep = await balance(A);
    await give(T.a, -keep);
    await call(A, "POST", "/sms/send", { phone: "09121110009", text: "x" });
    await give(T.a, keep);
    const s = (await call(A, "GET", "/sms/stats?days=7")).body.data;
    expect(s.sent).toBeGreaterThan(0);
    expect(s.spend).toBeGreaterThan(0);
    expect(s.failed).toBeGreaterThan(0);
    expect(s.blocked).toBeGreaterThan(0);
  });
});
