// Integration (seeded DB): availability, race-safe booking, status flow, move, waitlist, public online booking, isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { addDays, tehranNow, weekdayOf } from "./availability";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  return { status: r.status, body: await r.json() };
};

const nextOpenDay = (from: number) => { let d = addDays(tehranNow().date, from); while (weekdayOf(d) === 6) d = addDays(d, 1); return d; };
const D = nextOpenDay(3), D2 = nextOpenDay(5);
const T: Record<string, string> = {};
let SAL: Who, SALS: Who, ART: Who, OTH: Who, FREE: Who;
let s1: string, s2: string, svc60: string, svc30: string, cust: string, cust2: string;
const book = (who: Who, o: Record<string, unknown>) => call(who, "POST", "/calendar/appointments", { customerId: cust, staffId: s1, serviceId: svc60, date: D, startMin: 600, ...o });
const starts = async (who: Who, staffId: string, serviceId = svc60, date = D) => (await call(who, "GET", `/calendar/availability?serviceId=${serviceId}&date=${date}`)).body.data.staff.find((s: { staffId: string }) => s.staffId === staffId)?.starts as number[];

beforeAll(async () => {
  const stamp = Date.now();
  const mk = async (k: string, plan: string) => (T[k] = (await prisma.tenant.create({ data: { name: `cal-${k}`, slug: `cal-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id);
  await mk("sal", "salon"); await mk("art", "artist"); await mk("oth", "salon"); await mk("free", "free");
  SAL = { role: "OWNER", tenantId: T.sal }; SALS = { role: "STAFF", tenantId: T.sal }; ART = { role: "OWNER", tenantId: T.art }; OTH = { role: "OWNER", tenantId: T.oth }; FREE = { role: "OWNER", tenantId: T.free };

  s1 = (await call(SAL, "POST", "/staff", { name: "مریم", breaks: [{ s: 720, e: 780, label: "ناهار" }] })).body.data.id;
  s2 = (await call(SAL, "POST", "/staff", { name: "نازنین" })).body.data.id;
  svc60 = (await call(SAL, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_800_000, durationMin: 60, staffIds: [s1, s2] })).body.data.id;
  svc30 = (await call(SAL, "POST", "/services", { category: "ناخن", name: "مانیکور", price: 450_000, durationMin: 30, staffIds: [s1] })).body.data.id;
  cust = (await call(SAL, "POST", "/customers", { name: "سارا محمدی", phone: "09121110001" })).body.data.id;
  cust2 = (await call(SAL, "POST", "/customers", { name: "نیلوفر صادقی", phone: "09121110002" })).body.data.id;
  T.otherCust = (await call(OTH, "POST", "/customers", { name: "مشتری سالن دیگر", phone: "09121110003" })).body.data.id;
  // the artist tenant has one staff + service so its public page could otherwise work
  const as = (await call(ART, "POST", "/staff", { name: "هنرمند" })).body.data.id;
  await call(ART, "POST", "/services", { category: "مو", name: "کوتاهی", price: 650_000, durationMin: 45, staffIds: [as] });
});
beforeEach(() => resetRateLimits());
afterAll(async () => {
  const ids = Object.values(T).filter((x) => x !== T.otherCust);
  await prisma.appointment.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.waitlistEntry.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.calendarSettings.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { action: { in: ["calendar.settings", "customers.import"] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
});

describe("availability", () => {
  it("is gated by plan modules", async () => expect((await call(FREE, "GET", `/calendar/availability?serviceId=${svc60}&date=${D}`)).body.error.code).toBe("MODULE_NOT_ACTIVE"));

  it("lists grid starts, skipping the lunch break, and only for staff who do the service", async () => {
    const a = await starts(SAL, s1);
    expect(a[0]).toBe(540);
    expect(a).toContain(660); expect(a).not.toContain(690); expect(a).not.toContain(720); expect(a).toContain(780);
    expect((await call(SAL, "GET", `/calendar/availability?serviceId=${svc30}&date=${D}`)).body.data.staff.map((s: { staffId: string }) => s.staffId)).toEqual([s1]);
  });

  it("is empty on the salon's closed day and in the past", async () => {
    const friday = (() => { let d = addDays(tehranNow().date, 2); while (weekdayOf(d) !== 6) d = addDays(d, 1); return d; })();
    expect(await starts(SAL, s1, svc60, friday)).toEqual([]);
    expect(await starts(SAL, s1, svc60, addDays(tehranNow().date, -1))).toEqual([]);
  });

  it("respects a leave and a configured slot step", async () => {
    await call(SAL, "POST", `/staff/${s2}/leaves`, { fromDate: D2, toDate: D2 });
    expect(await starts(SAL, s2, svc60, D2)).toEqual([]);
    expect((await starts(SAL, s1, svc60, D2)).length).toBeGreaterThan(0);
    expect((await call(SALS, "PUT", "/calendar/settings", { stepMin: 60 })).status).toBe(403);
    await call(SAL, "PUT", "/calendar/settings", { stepMin: 60 });
    expect((await starts(SAL, s1)).every((m) => m % 60 === 0)).toBe(true);
    await call(SAL, "PUT", "/calendar/settings", { stepMin: 30 });
  });
});

describe("booking by staff", () => {
  it("books a slot and removes it from availability", async () => {
    const r = await book(SAL, { startMin: 600 });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: "CONFIRMED", source: "STAFF", serviceName: "رنگ ریشه", price: 1_800_000, customerName: "سارا محمدی", staffName: "مریم", date: D });
    T.a1 = r.body.data.id;
    const a = await starts(SAL, s1);
    expect(a).not.toContain(600); expect(a).not.toContain(570); expect(a).toContain(540); expect(a).toContain(660);
  });

  it("refuses overlaps, breaks, closed hours and Fridays (and says why)", async () => {
    for (const startMin of [600, 630, 570]) expect((await book(SAL, { startMin })).body.error.code).toBe("SLOT_UNAVAILABLE");
    expect((await book(SAL, { startMin: 700 })).status).toBe(409); // runs into lunch
    expect((await book(SAL, { startMin: 480 })).status).toBe(409); // before opening
    expect((await book(SAL, { startMin: 1110 })).status).toBe(409); // ends after closing
    const friday = (() => { let d = addDays(tehranNow().date, 2); while (weekdayOf(d) !== 6) d = addDays(d, 1); return d; })();
    expect((await book(SAL, { date: friday })).status).toBe(409);
  });

  it("allows an off-grid minute for walk-ins when it fits", async () => {
    expect((await book(SAL, { staffId: s2, startMin: 615 })).status).toBe(200);
  });

  it("the database stops simultaneous bookings: exactly one of N parallel requests wins", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => book(SAL, { staffId: s2, startMin: 900, customerId: i % 2 ? cust : cust2 })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(5);
    expect(await prisma.appointment.count({ where: { tenantId: T.sal, staffId: s2, startMin: 900 } })).toBe(1);
  });

  it("validates references and dates", async () => {
    expect((await book(SAL, { staffId: s2, serviceId: svc30, startMin: 1000 })).body.error.message).toContain("این خدمت را انجام نمی‌دهد");
    expect((await book(SAL, { customerId: T.otherCust, startMin: 1000 })).status).toBe(400); // another salon's customer
    expect((await book(SAL, { date: addDays(tehranNow().date, -2) })).status).toBe(400);
    expect((await book(SAL, { date: "2026-02-30" })).status).toBe(422);
    expect((await book(SAL, { startMin: 2000 })).status).toBe(422);
    expect((await book(SAL, { serviceId: "nope" })).status).toBe(404);
  });

  it("is isolated per salon", async () => {
    expect((await call(OTH, "GET", `/calendar/appointments/${T.a1}`)).status).toBe(404);
    for (const act of ["confirm", "cancel"]) expect((await call(OTH, "POST", `/calendar/appointments/${T.a1}/${act}`, {})).status).toBe(404);
    expect((await call(OTH, "POST", `/calendar/appointments/${T.a1}/move`, { date: D, startMin: 540 })).status).toBe(404);
    expect((await call(OTH, "GET", `/calendar/appointments?date=${D}`)).body.data).toEqual([]);
    expect((await call(SAL, "GET", `/calendar/appointments?date=${D}`)).body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe("status flow, move, cancel", () => {
  it("cancel frees the slot and can't be repeated", async () => {
    const id = (await book(SAL, { startMin: 1000 })).body.data.id;
    const c = await call(SAL, "POST", `/calendar/appointments/${id}/cancel`, { reason: "مشتری انصراف داد" });
    expect(c.body.data).toMatchObject({ status: "CANCELED", cancelReason: "مشتری انصراف داد" });
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/cancel`, {})).body.error.code).toBe("BAD_TRANSITION");
    expect((await book(SAL, { startMin: 1000 })).status).toBe(200); // the slot is free again
  });

  it("moves to a free slot (even overlapping its own old time) and refuses an occupied one", async () => {
    const id = (await book(SAL, { startMin: 840, staffId: s1 })).body.data.id;
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/move`, { date: D, startMin: 855 })).body.data.startMin).toBe(855); // shifts 15 min, overlapping itself
    const blocked = await call(SAL, "POST", `/calendar/appointments/${id}/move`, { date: D, startMin: 600 });
    expect(blocked.status).toBe(409);
    expect((await call(SAL, "GET", `/calendar/appointments/${id}`)).body.data.startMin).toBe(855); // unchanged after the refusal
    const other = await call(SAL, "POST", `/calendar/appointments/${id}/move`, { date: D, startMin: 780, staffId: s2 });
    expect(other.body.data).toMatchObject({ date: D, staffId: s2, startMin: 780 });
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/move`, { date: D, startMin: 540, staffId: "nope" })).status).toBe(400);
  });

  it("walks pending → confirmed → in service → done, writes the customer's history exactly once", async () => {
    const id = (await book(SAL, { startMin: 1080, status: "PENDING" })).body.data.id;
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/status`, { status: "DONE" })).body.error.code).toBe("BAD_TRANSITION"); // can't skip
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/confirm`, {})).body.data.status).toBe("CONFIRMED");
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/status`, { status: "IN_SERVICE" })).body.data.status).toBe("IN_SERVICE");
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/move`, { date: D, startMin: 540 })).body.error.code).toBe("BAD_TRANSITION");
    const [a, b] = await Promise.all([call(SAL, "POST", `/calendar/appointments/${id}/status`, { status: "DONE" }), call(SAL, "POST", `/calendar/appointments/${id}/status`, { status: "DONE" })]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const profile = (await call(SAL, "GET", `/customers/${cust}`)).body.data;
    expect(profile.visits.filter((v: { service: string }) => v.service === "رنگ ریشه")).toHaveLength(1);
    expect(profile.stats.totalSpent).toBe(1_800_000);
    expect((await call(SAL, "POST", `/calendar/appointments/${id}/status`, { status: "NO_SHOW" })).status).toBe(409);
  });

  it("a no-show releases the slot", async () => {
    const id = (await book(SAL, { startMin: 1080, staffId: s2 })).body.data.id; // 18:00–19:00
    await call(SAL, "POST", `/calendar/appointments/${id}/status`, { status: "NO_SHOW" });
    expect((await book(SAL, { startMin: 1080, staffId: s2 })).status).toBe(200);
  });

  it("filters the list by staff / status / range and caps the range", async () => {
    expect((await call(SAL, "GET", `/calendar/appointments?date=${D}&staffId=${s2}`)).body.data.every((a: { staffId: string }) => a.staffId === s2)).toBe(true);
    expect((await call(SAL, "GET", `/calendar/appointments?date=${D}&status=CANCELED`)).body.data.every((a: { status: string }) => a.status === "CANCELED")).toBe(true);
    expect((await call(SAL, "GET", `/calendar/appointments?from=${D}&to=${D2}`)).status).toBe(200);
    expect((await call(SAL, "GET", `/calendar/appointments?from=${D}&to=${addDays(D, 90)}`)).status).toBe(400);
  });
});

describe("waitlist", () => {
  it("collects entries and books one into a real appointment, creating the customer by phone", async () => {
    const w = await call(SAL, "POST", "/calendar/waitlist", { name: "پریسا نوری", phone: "۰۹۱۲۱۱۱۰۰۱۱", serviceId: svc60, fromDate: D, toDate: D2, note: "ترجیحاً عصر" });
    expect(w.status).toBe(200);
    expect((await call(SAL, "GET", "/calendar/waitlist")).body.data).toHaveLength(1);
    const b = await call(SAL, "POST", `/calendar/waitlist/${w.body.data.id}/book`, { staffId: s1, date: D2, startMin: 900 });
    expect(b.body.data).toMatchObject({ customerName: "پریسا نوری", customerPhone: "09121110011", status: "CONFIRMED" });
    expect((await call(SAL, "GET", "/calendar/waitlist")).body.data).toHaveLength(0);
    expect((await call(SAL, "POST", `/calendar/waitlist/${w.body.data.id}/book`, { staffId: s1, date: D2, startMin: 960 })).status).toBe(404); // already booked
    expect((await call(OTH, "DELETE", `/calendar/waitlist/${w.body.data.id}`)).status).toBe(404);
  });
});

describe("public online booking", () => {
  const slug = () => prisma.tenant.findUniqueOrThrow({ where: { id: T.sal } }).then((t) => t.slug);
  const pub = async (method: string, path: string, body?: unknown) => call(null, method, `/public/salons/${await slug()}${path}`, body);
  const PD = nextOpenDay(10);
  const startsFor = async (staffId?: string) => (await pub("GET", `/availability?serviceId=${svc60}&date=${PD}${staffId ? `&staffId=${staffId}` : ""}`)).body.data.staff;

  it("shows only bookable services and listed staff, without internal data", async () => {
    await call(SAL, "PATCH", `/staff/${s2}`, { listed: false });
    const r = await pub("GET", "");
    expect(r.status).toBe(200);
    expect(r.body.data.staff.map((s: { id: string }) => s.id)).toEqual([s1]);
    expect(r.body.data.services.find((s: { id: string }) => s.id === svc60).staffIds).toEqual([s1]);
    expect(JSON.stringify(r.body.data)).not.toContain(T.sal);
    await call(SAL, "PATCH", `/staff/${s2}`, { listed: true });
  });

  it("books as pending, returns only a receipt, and the slot becomes unavailable", async () => {
    const r = await pub("POST", "/appointments", { serviceId: svc60, staffId: s1, date: PD, startMin: 600, name: "مشتری آنلاین", phone: "۰۹۱۳۱۱۱۰۰۰۱" });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ status: "PENDING", serviceName: "رنگ ریشه", staffName: "مریم" });
    expect(Object.keys(r.body.data).sort()).toEqual(["date", "id", "serviceName", "staffName", "startMin", "status"]);
    expect((await startsFor(s1))[0].starts).not.toContain(600);
    expect((await pub("POST", "/appointments", { serviceId: svc60, staffId: s1, date: PD, startMin: 600, name: "دیگری", phone: "09131110002" })).body.error.code).toBe("SLOT_TAKEN");
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { id: r.body.data.id }, include: { customer: true } });
    expect(appt).toMatchObject({ source: "ONLINE", status: "PENDING" });
    expect(appt.customer).toMatchObject({ phone: "09131110001", name: "مشتری آنلاین" });
  });

  it("with no staff chosen it picks someone who is actually free", async () => {
    const r = await pub("POST", "/appointments", { serviceId: svc60, date: PD, startMin: 600, name: "بدون انتخاب", phone: "09131110003" });
    expect(r.status).toBe(200);
    expect(r.body.data.staffName).toBe("نازنین"); // مریم is taken at 10:00
  });

  it("auto-confirm setting confirms immediately", async () => {
    await call(SAL, "PUT", "/calendar/settings", { autoConfirm: true });
    const r = await pub("POST", "/appointments", { serviceId: svc60, staffId: s1, date: PD, startMin: 900, name: "تأیید خودکار", phone: "09131110004" });
    expect(r.body.data.status).toBe("CONFIRMED");
    await call(SAL, "PUT", "/calendar/settings", { autoConfirm: false });
  });

  it("enforces the minimum notice and the booking horizon", async () => {
    const now = tehranNow();
    const today = (await pub("GET", `/availability?serviceId=${svc60}&date=${now.date}`)).body.data.staff;
    for (const s of today) expect(s.starts.every((m: number) => m >= now.minute + 120)).toBe(true);
    const tooSoon = await pub("POST", "/appointments", { serviceId: svc60, staffId: s1, date: now.date, startMin: now.minute + 30, name: "خیلی زود", phone: "09131110005" });
    expect([409, 400]).toContain(tooSoon.status);
    expect((await pub("POST", "/appointments", { serviceId: svc60, date: addDays(now.date, 200), startMin: 600, name: "خیلی دور", phone: "09131110005" })).status).toBe(400);
  });

  it("limits open online bookings per phone and per IP", async () => {
    for (const m of [540, 780, 840]) expect((await pub("POST", "/appointments", { serviceId: svc60, staffId: s1, date: nextOpenDay(12), startMin: m, name: "پرمراجعه", phone: "09131119999" })).status).toBe(200);
    expect((await pub("POST", "/appointments", { serviceId: svc60, staffId: s1, date: nextOpenDay(12), startMin: 900, name: "پرمراجعه", phone: "09131119999" })).status).toBe(429);
  });

  it("rejects garbage and unknown salons", async () => {
    expect((await pub("POST", "/appointments", { serviceId: svc60, date: PD, startMin: 600, name: "x", phone: "1" })).status).toBe(422);
    expect((await call(null, "GET", "/public/salons/no-such-salon")).status).toBe(404);
    expect((await pub("POST", "/appointments", { serviceId: svc60, staffId: "nope", date: PD, startMin: 660, name: "نام درست", phone: "09131110006" })).status).toBe(400);
  });

  it("can be switched off by the salon, and isn't available on plans without direct booking", async () => {
    await call(SAL, "PUT", "/calendar/settings", { onlineEnabled: false });
    expect((await pub("GET", "")).body.error.code).toBe("ONLINE_DISABLED");
    await call(SAL, "PUT", "/calendar/settings", { onlineEnabled: true });
    const artSlug = (await prisma.tenant.findUniqueOrThrow({ where: { id: T.art } })).slug;
    const r = await call(null, "GET", `/public/salons/${artSlug}`);
    expect(r.status).toBe(403);
    expect(r.body.error).toMatchObject({ code: "PLAN_LIMIT", details: { feature: "directBooking" } });
  });

  it("online bookings show up on the salon's calendar for confirmation", async () => {
    const pending = (await call(SAL, "GET", `/calendar/appointments?date=${PD}&status=PENDING`)).body.data;
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((a: { source: string }) => a.source === "ONLINE")).toBe(true);
    expect((await call(SAL, "POST", `/calendar/appointments/${pending[0].id}/confirm`, {})).body.data.status).toBe("CONFIRMED");
  });

  it("public waitlist works and is capped per phone", async () => {
    const body = { name: "منتظر", phone: "09131118888", serviceId: svc60, fromDate: PD, toDate: PD };
    for (let i = 0; i < 3; i++) expect((await pub("POST", "/waitlist", body)).status).toBe(200);
    expect((await pub("POST", "/waitlist", body)).status).toBe(429);
  });
});
