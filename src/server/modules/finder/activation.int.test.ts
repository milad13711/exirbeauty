// Integration (seeded DB): a finder listing pays for its plan and becomes a real, bookable salon.
// Gateways are fakes: no SMS is sent and no money moves.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setSmsGateway } from "../../platform/sms";
import { setZarinpalClient, type ZarinpalClient } from "../../platform/payments/zarinpal";
import { addDays, tehranNow, weekdayOf } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, redirect: "manual", headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const text = await r.text();
  return { status: r.status, headers: r.headers, body: text ? JSON.parse(text) : null };
};

const ADMIN: Who = { role: "SUPER_ADMIN", tenantId: null };
const PHONES = ["09160000001", "09160000002", "09160000003", "09160000004", "09160000005", "09160000006"];
const lids: string[] = [];
let sent: { to: string; text: string }[] = [];

const fake: ZarinpalClient = {
  request: async ({ amount }) => ({ authority: `L${amount}-${Math.random().toString(36).slice(2, 10)}` }),
  verify: async () => ({ code: verifyCode, refId: "555", cardPan: "6037****9999" }),
  startUrl: (a) => `https://pay.test/${a}`,
};
let verifyCode = 100;

const mk = (plan: string, phone: string, extra: Record<string, unknown> = {}) => ({ plan, name: "مدیر تست", brand: "سالن تست فعال‌سازی", phone, city: "قم", x: 201, y: 186, cats: ["مو"], bio: "x", ...extra });
async function listing(plan: string, phone: string, extra: Record<string, unknown> = {}, publish = true) {
  const r = await call(null, "POST", "/finder/listings", mk(plan, phone, extra));
  expect(r.status).toBe(200);
  lids.push(r.body.data.id);
  if (publish) expect((await call(ADMIN, "POST", `/admin/finder/listings/${r.body.data.id}/approve`, {})).status).toBe(200);
  return { id: r.body.data.id as string, code: r.body.data.editCode as string };
}
const activate = (l: { id: string; code: string }, months = 1) => call(null, "POST", `/finder/listings/${l.id}/activate`, { months }, { "x-edit-code": l.code });
const payCallback = async (paymentId: string, status = "OK") => {
  const p = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  return call(null, "GET", `/payments/zarinpal/callback?Authority=${p.authority}&Status=${status}`);
};
const nextOpenDay = () => { let d = addDays(tehranNow().date, 3); while (weekdayOf(d) === 6) d = addDays(d, 1); return d; };

beforeAll(() => { setZarinpalClient(fake); setSmsGateway({ send: async (to, text) => { sent.push({ to, text }); } }); });
beforeEach(() => { resetRateLimits(); verifyCode = 100; sent = []; });
afterAll(async () => {
  setZarinpalClient(null); setSmsGateway(null);
  const ls = await prisma.finderListing.findMany({ where: { id: { in: lids } }, select: { tenantId: true } });
  const tenants = ls.map((l) => l.tenantId).filter((x): x is string => !!x);
  await prisma.payment.deleteMany({ where: { OR: [{ listingId: { in: lids } }, { tenantId: { in: tenants } }] } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.calendarSettings.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.finderListing.deleteMany({ where: { id: { in: lids } } });
  await prisma.otpCode.deleteMany({ where: { phone: { in: PHONES } } });
  await prisma.user.deleteMany({ where: { phone: { in: PHONES } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { in: ["finder.approve", "staff.deactivate"] } } });
});

describe("starting an activation", () => {
  it("only the owner (edit code) of a published, paid-plan listing without a salon may pay", async () => {
    const l = await listing("salon", PHONES[5]);
    expect((await call(null, "POST", `/finder/listings/${l.id}/activate`, { months: 1 }, { "x-edit-code": "WRONGCODE1" })).body.error.code).toBe("BAD_EDIT_CODE");
    const unpublished = await listing("salon", PHONES[4], {}, false);
    expect((await activate(unpublished)).body.error.code).toBe("NOT_PUBLISHED");
    const free = await listing("free", PHONES[3]);
    expect((await activate(free)).status).toBe(400);
    // a number that already has an account elsewhere can't be provisioned (we'd have to take over that login)
    await prisma.user.create({ data: { phone: PHONES[2], name: "کاربر قبلی", role: "OWNER" } });
    const taken = await listing("artist", PHONES[2]);
    expect((await activate(taken)).body.error.code).toBe("PHONE_TAKEN");
    expect((await prisma.payment.count({ where: { listingId: taken.id } }))).toBe(0); // nothing was charged
  });

  it("prices from the DB and validates months", async () => {
    const l = await listing("artist", PHONES[1]);
    const artist = await prisma.plan.findUniqueOrThrow({ where: { code: "artist" } });
    const r = await activate(l, 3);
    expect(r.body.data.amount).toBe(artist.priceMonthly * 3);
    expect((await call(null, "POST", `/finder/listings/${l.id}/activate`, { months: 99 }, { "x-edit-code": l.code })).status).toBe(422);
  });
});

describe("a salon-plan listing becomes a working salon", () => {
  let l: { id: string; code: string }, tenantId: string, slug: string, ownerStaff: string[];

  it("payment provisions the tenant, its owner login, subscription, modules and staff — once", async () => {
    l = await listing("salon", PHONES[0], { staff: [{ name: "متخصص اول", cats: ["مو"] }, { name: "متخصص دوم", cats: ["پوست"] }] });
    const salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } });
    const start = await activate(l, 2);
    expect(start.body.data.amount).toBe(salon.priceMonthly * 2);
    const cb = await payCallback(start.body.data.paymentId);
    expect(cb.status).toBe(303);

    const row = await prisma.finderListing.findUniqueOrThrow({ where: { id: l.id }, include: { staff: true } });
    expect(row.tenantId).toBeTruthy();
    tenantId = row.tenantId!;
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, include: { subscription: { include: { plan: true } }, modules: true } });
    slug = tenant.slug;
    expect(tenant).toMatchObject({ name: "سالن تست فعال‌سازی", city: "قم", status: "ACTIVE" });
    expect(tenant.subscription!.plan.code).toBe("salon");
    const days = (tenant.subscription!.expiresAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(59); expect(days).toBeLessThan(61);
    expect(tenant.modules.map((m) => m.moduleId)).toEqual(expect.arrayContaining(["calendar", "customers", "services", "staff", "cashier"]));
    expect(await prisma.user.findUniqueOrThrow({ where: { phone: PHONES[0] } })).toMatchObject({ role: "OWNER", tenantId });
    const staff = await prisma.staff.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
    expect(staff.map((s) => s.name)).toEqual(["متخصص اول", "متخصص دوم"]);
    expect(row.staff.map((s) => s.staffId).sort()).toEqual(staff.map((s) => s.id).sort());
    ownerStaff = staff.map((s) => s.id);

    // refresh / replay of the bank callback must not create a second salon or extend twice
    const before = tenant.subscription!.expiresAt!.getTime();
    await payCallback(start.body.data.paymentId);
    expect(await prisma.tenant.count({ where: { name: "سالن تست فعال‌سازی", id: tenantId } })).toBe(1);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { tenantId } })).expiresAt!.getTime()).toBe(before);
    expect((await prisma.finderListing.findUniqueOrThrow({ where: { id: l.id } })).tenantId).toBe(tenantId);
  });

  it("the public map now shows live booking info and the salon's real staff", async () => {
    const d = (await call(null, "GET", `/finder/listings/${l.id}`)).body.data;
    expect(d.booking).toEqual({ slug, direct: true });
    expect(d.staff.map((s: { bookingStaffId: string }) => s.bookingStaffId).sort()).toEqual([...ownerStaff].sort());
    expect(JSON.stringify(d)).not.toContain(tenantId); // internal ids stay internal
  });

  it("the owner signs in with an SMS code and runs the salon; online booking works end to end", async () => {
    expect((await call(null, "POST", "/auth/otp/request", { phone: PHONES[0] })).status).toBe(200);
    const code = /(\d{6})/.exec(sent.at(-1)!.text)![1];
    const login = await call(null, "POST", "/auth/otp/verify", { phone: PHONES[0], code });
    expect(login.body.data).toMatchObject({ role: "OWNER", tenantId });
    const OWNER: Who = { role: "OWNER", tenantId };

    expect((await call(OWNER, "GET", "/staff")).body.data).toHaveLength(2);
    const svc = (await call(OWNER, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_800_000, durationMin: 60, staffIds: ownerStaff })).body.data.id;
    const pub = await call(null, "GET", `/public/salons/${slug}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.services.map((s: { id: string }) => s.id)).toEqual([svc]);

    const day = nextOpenDay();
    const avail = await call(null, "GET", `/public/salons/${slug}/availability?serviceId=${svc}&date=${day}&staffId=${ownerStaff[0]}`);
    const start = avail.body.data.staff[0].starts[0];
    const booked = await call(null, "POST", `/public/salons/${slug}/appointments`, { serviceId: svc, staffId: ownerStaff[0], date: day, startMin: start, name: "مشتری از نقشه", phone: "09161110001" });
    expect(booked.status).toBe(200);
    expect(booked.body.data.status).toBe("PENDING");
    expect((await call(OWNER, "GET", `/calendar/appointments?date=${day}`)).body.data).toHaveLength(1); // it is on the owner's calendar
  });

  it("the dashboard is the source of truth: deactivating a person removes their pin", async () => {
    await call({ role: "OWNER", tenantId }, "DELETE", `/staff/${ownerStaff[1]}`);
    const d = (await call(null, "GET", `/finder/listings/${l.id}`)).body.data;
    expect(d.staff.map((s: { bookingStaffId: string }) => s.bookingStaffId)).toEqual([ownerStaff[0]]);
  });

  it("the owner sees the salon state, can't pay twice, and listing edits don't touch staff", async () => {
    const view = await call(null, "GET", `/finder/listings/${l.id}/manage`, undefined, { "x-edit-code": l.code });
    expect(view.body.data.salon).toMatchObject({ slug, active: true });
    expect(view.body.data.activation).toMatchObject({ available: false, reason: "ALREADY_ACTIVE" });
    expect((await activate(l)).body.error.code).toBe("ALREADY_ACTIVE");

    const edit = await call(null, "PUT", `/finder/listings/${l.id}`, { name: "مدیر تست", brand: "نام جدید سالن", phone: PHONES[0], city: "قم", x: 201, y: 186, cats: ["مو"], bio: "x", staff: [{ name: "نفر جعلی", cats: ["مو"] }] }, { "x-edit-code": l.code });
    expect(edit.body.data.pendingEdit).toBe(true);
    await call(ADMIN, "POST", `/admin/finder/listings/${l.id}/approve`, {});
    expect((await call(null, "GET", `/finder/listings/${l.id}`)).body.data.brand).toBe("نام جدید سالن");
    expect((await prisma.staff.findMany({ where: { tenantId } })).map((s) => s.name)).not.toContain("نفر جعلی");
  });
});

describe("other outcomes", () => {
  it("an artist-plan listing gets a dashboard and one staff member but not direct online booking", async () => {
    const l = await listing("artist", PHONES[1].replace("2", "9"));
    PHONES.push(PHONES[1].replace("2", "9"));
    const start = await activate(l);
    await payCallback(start.body.data.paymentId);
    const row = await prisma.finderListing.findUniqueOrThrow({ where: { id: l.id } });
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: row.tenantId! } });
    expect(await prisma.staff.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect((await call(null, "GET", `/finder/listings/${l.id}`)).body.data.booking).toEqual({ slug: tenant.slug, direct: false });
    const pub = await call(null, "GET", `/public/salons/${tenant.slug}`);
    expect(pub.status).toBe(403);
    expect(pub.body.error).toMatchObject({ code: "PLAN_LIMIT", details: { feature: "directBooking" } });
    expect((await call(null, "POST", `/finder/listings/${l.id}/leads`, { name: "مشتری", phone: "09161110002" })).status).toBe(200); // requests still arrive
  });

  it("a cancelled or failed payment creates no salon", async () => {
    const l = await listing("artist", "09160000007");
    PHONES.push("09160000007");
    const a = await activate(l);
    await payCallback(a.body.data.paymentId, "NOK");
    expect((await prisma.finderListing.findUniqueOrThrow({ where: { id: l.id } })).tenantId).toBeNull();
    verifyCode = -50;
    const b = await activate(l);
    await payCallback(b.body.data.paymentId);
    expect((await prisma.finderListing.findUniqueOrThrow({ where: { id: l.id } })).tenantId).toBeNull();
    expect(await prisma.user.count({ where: { phone: "09160000007" } })).toBe(0);
    // and the owner can still try again successfully
    verifyCode = 100;
    const c = await activate(l);
    await payCallback(c.body.data.paymentId);
    expect((await prisma.finderListing.findUniqueOrThrow({ where: { id: l.id } })).tenantId).toBeTruthy();
  });
});
