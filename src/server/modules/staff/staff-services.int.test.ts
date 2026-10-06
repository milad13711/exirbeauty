// Integration (seeded DB): staff + services modules — plan limits, schedule rules, isolation, roles, invite.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  return { status: r.status, body: await r.json() };
};

const T: Record<string, string> = {};
let ART: Who, ARTS: Who, SAL: Who, FREE: Who;
const person = (n: string, extra = {}) => ({ name: n, ...extra });

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, code] of [["art", "artist"], ["sal", "salon"], ["free", "free"]] as const) {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code } });
    T[k] = (await prisma.tenant.create({ data: { name: `ss-${k}`, slug: `ss-${k}-${stamp}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  }
  ART = { role: "OWNER", tenantId: T.art }; ARTS = { role: "STAFF", tenantId: T.art }; SAL = { role: "OWNER", tenantId: T.sal }; FREE = { role: "OWNER", tenantId: T.free };
});
afterAll(async () => {
  const ids = Object.values(T);
  await prisma.service.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: ids } } });
  await prisma.user.deleteMany({ where: { phone: { in: ["09150000001", "09150000002", "09150000003"] } } });
  await prisma.auditLog.deleteMany({ where: { action: { in: ["staff.deactivate", "staff.invite", "services.archive"] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
});

describe("staff module", () => {
  it("is gated by the plan's modules and by role", async () => {
    expect((await call(null, "GET", "/staff")).status).toBe(401);
    expect((await call(FREE, "GET", "/staff")).body.error.code).toBe("MODULE_NOT_ACTIVE");
    expect((await call(ARTS, "POST", "/staff", person("پرسنل"))).status).toBe(403); // only owners create
  });

  it("enforces the plan's staff limit: artist = 1 person", async () => {
    const first = await call(ART, "POST", "/staff", person("هنرمند اول"));
    expect(first.status).toBe(200);
    T.artStaff = first.body.data.id;
    const second = await call(ART, "POST", "/staff", person("نفر دوم"));
    expect(second.status).toBe(409);
    expect(second.body.error).toMatchObject({ code: "PLAN_LIMIT", details: { feature: "staff", limit: 1 } });
  });

  it("deactivating frees a slot; re-activating is blocked while the slot is taken", async () => {
    expect((await call(ART, "DELETE", `/staff/${T.artStaff}`)).status).toBe(200);
    const replacement = await call(ART, "POST", "/staff", person("جایگزین"));
    expect(replacement.status).toBe(200);
    const back = await call(ART, "PATCH", `/staff/${T.artStaff}`, { active: true });
    expect(back.status).toBe(409);
    expect(back.body.error.code).toBe("PLAN_LIMIT");
    expect((await call(ART, "GET", "/staff")).body.data.map((s: { name: string }) => s.name)).toEqual(["جایگزین"]);
    expect((await call(ART, "GET", "/staff?all=1")).body.data).toHaveLength(2);
  });

  it("salon plan allows 10 and refuses the 11th", async () => {
    for (let i = 1; i <= 10; i++) expect((await call(SAL, "POST", "/staff", person(`متخصص ${i}`))).status).toBe(200);
    const r = await call(SAL, "POST", "/staff", person("متخصص ۱۱"));
    expect(r.status).toBe(409);
    expect(r.body.error.details).toMatchObject({ feature: "staff", limit: 10 });
  });

  it("validates the weekly schedule, also on partial updates", async () => {
    expect((await call(SAL, "POST", "/staff", person("بد", { startMin: 600, endMin: 600 }))).status).toBe(400);
    const id = (await call(SAL, "GET", "/staff")).body.data[0].id;
    expect((await call(SAL, "PATCH", `/staff/${id}`, { breaks: [{ s: 100, e: 200, label: "ناهار" }] })).status).toBe(400); // before work starts
    expect((await call(SAL, "PATCH", `/staff/${id}`, { breaks: [{ s: 700, e: 760 }, { s: 740, e: 800 }] })).status).toBe(400); // overlap
    expect((await call(SAL, "PATCH", `/staff/${id}`, { endMin: 600 })).status).toBe(200);
    expect((await call(SAL, "PATCH", `/staff/${id}`, { startMin: 700 })).status).toBe(400); // merged with stored endMin=600
    expect((await call(SAL, "PATCH", `/staff/${id}`, { color: "red" })).status).toBe(422);
    expect((await call(SAL, "PATCH", `/staff/${id}`, { breaks: [{ s: 720, e: 780, label: "ناهار" }], daysOff: [5, 6] })).status).toBe(400); // break after the new endMin
  });

  it("a partial update changes only what was sent (no defaults leak back in)", async () => {
    const id = (await call(SAL, "GET", "/staff")).body.data[3].id;
    await call(SAL, "PATCH", `/staff/${id}`, { daysOff: [4, 5], endMin: 1000, listed: false, commissionPct: 45, breaks: [{ s: 700, e: 760, label: "ناهار" }] });
    await call(SAL, "PATCH", `/staff/${id}`, { title: "متخصص رنگ" });
    const s = (await call(SAL, "GET", `/staff/${id}`)).body.data;
    expect(s).toMatchObject({ title: "متخصص رنگ", daysOff: [4, 5], endMin: 1000, listed: false, commissionPct: 45, active: true });
    expect(s.breaks).toEqual([{ s: 700, e: 760, label: "ناهار" }]);
  });

  it("never exposes one salon's staff to another", async () => {
    expect((await call(SAL, "GET", `/staff/${T.artStaff}`)).status).toBe(404);
    expect((await call(SAL, "PATCH", `/staff/${T.artStaff}`, { name: "هک" })).status).toBe(404);
    expect((await call(SAL, "DELETE", `/staff/${T.artStaff}`)).status).toBe(404);
    expect((await call(SAL, "POST", `/staff/${T.artStaff}/leaves`, { fromDate: "2026-10-10", toDate: "2026-10-12" })).status).toBe(404);
    expect((await call(SAL, "POST", `/staff/${T.artStaff}/invite`, { phone: "09150000001" })).status).toBe(404);
  });

  it("records leaves and validates their dates", async () => {
    const id = (await call(SAL, "GET", "/staff")).body.data[0].id;
    expect((await call(SAL, "POST", `/staff/${id}/leaves`, { fromDate: "2026-10-12", toDate: "2026-10-10" })).status).toBe(422);
    const l = await call(SAL, "POST", `/staff/${id}/leaves`, { fromDate: "2026-10-10", toDate: "2026-10-12", reason: "سفر" });
    expect(l.status).toBe(200);
    expect((await call(SAL, "GET", `/staff/${id}`)).body.data.leaves).toHaveLength(1);
    expect((await call(ART, "DELETE", `/staff/${id}/leaves/${l.body.data.id}`)).status).toBe(404); // other salon
    expect((await call(SAL, "DELETE", `/staff/${id}/leaves/${l.body.data.id}`)).status).toBe(200);
  });

  it("invites a person with an OTP login, but never takes over someone else's number", async () => {
    const id = (await call(SAL, "GET", "/staff")).body.data[1].id;
    const ok = await call(SAL, "POST", `/staff/${id}/invite`, { phone: "۰۹۱۵۰۰۰۰۰۰۱" });
    expect(ok.body.data.loginPhone).toBe("09150000001");
    const user = await prisma.user.findUniqueOrThrow({ where: { phone: "09150000001" } });
    expect(user).toMatchObject({ role: "STAFF", tenantId: T.sal });
    expect((await call(SAL, "GET", `/staff/${id}`)).body.data.loginPhone).toBe("09150000001");
    // same number in another salon
    expect((await call(ART, "POST", `/staff/${T.artStaff}/invite`, { phone: "09150000001" })).body.error.code).toBe("PHONE_TAKEN");
    // a number already linked to a different staff member of the same salon
    const other = (await call(SAL, "GET", "/staff")).body.data[2].id;
    expect((await call(SAL, "POST", `/staff/${other}/invite`, { phone: "09150000001" })).body.error.code).toBe("PHONE_TAKEN");
    // an owner's number can't become staff
    await prisma.user.create({ data: { phone: "09150000002", name: "مالک", role: "OWNER", tenantId: T.sal } });
    expect((await call(SAL, "POST", `/staff/${other}/invite`, { phone: "09150000002" })).body.error.code).toBe("PHONE_TAKEN");
  });
});

describe("services module", () => {
  let staffA: string, staffB: string, svc: string;
  beforeAll(async () => {
    const list = (await call(SAL, "GET", "/staff")).body.data;
    staffA = list[0].id; staffB = list[1].id;
  });

  it("requires the module and (for writes) an owner", async () => {
    expect((await call(FREE, "GET", "/services")).body.error.code).toBe("MODULE_NOT_ACTIVE");
    expect((await call({ role: "STAFF", tenantId: T.sal }, "POST", "/services", { category: "مو", name: "کوتاهی", price: 650000, durationMin: 45 })).status).toBe(403);
  });

  it("creates a service assigned to staff and lists it with its staff ids", async () => {
    const r = await call(SAL, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_800_000, durationMin: 120, staffIds: [staffA, staffB, staffA] });
    expect(r.status).toBe(200);
    svc = r.body.data.id;
    expect(r.body.data.staffIds.sort()).toEqual([staffA, staffB].sort());
    await call(SAL, "POST", "/services", { category: "پوست", name: "فیشیال", price: 1_900_000, durationMin: 75 });
    expect((await call(SAL, "GET", "/services")).body.data).toHaveLength(2);
    expect((await call(SAL, "GET", "/services?category=پوست")).body.data.map((s: { name: string }) => s.name)).toEqual(["فیشیال"]);
  });

  it("validates input", async () => {
    expect((await call(SAL, "POST", "/services", { category: "مو", name: "x", price: 1, durationMin: 60 })).status).toBe(422);
    expect((await call(SAL, "POST", "/services", { category: "مو", name: "کوتاهی", price: -5, durationMin: 60 })).status).toBe(422);
    expect((await call(SAL, "POST", "/services", { category: "مو", name: "کوتاهی", price: 5, durationMin: 2 })).status).toBe(422);
  });

  it("rejects staff from another salon, and replaces assignments atomically", async () => {
    expect((await call(SAL, "PUT", `/services/${svc}/staff`, { staffIds: [T.artStaff] })).status).toBe(400);
    expect((await call(SAL, "GET", `/services/${svc}`)).body.data.staffIds).toHaveLength(2); // unchanged after the failed attempt
    const r = await call(SAL, "PUT", `/services/${svc}/staff`, { staffIds: [staffB] });
    expect(r.body.data.staffIds).toEqual([staffB]);
    expect((await call(SAL, "POST", "/services", { category: "مو", name: "جعلی", price: 1000, durationMin: 30, staffIds: [T.artStaff] })).status).toBe(400);
  });

  it("is isolated per salon", async () => {
    expect((await call(ART, "GET", `/services/${svc}`)).status).toBe(404);
    expect((await call(ART, "PATCH", `/services/${svc}`, { price: 1 })).status).toBe(404);
    expect((await call(ART, "DELETE", `/services/${svc}`)).status).toBe(404);
    expect((await call(ART, "GET", "/services")).body.data).toEqual([]);
  });

  it("a partial update changes only what was sent (no defaults leak back in)", async () => {
    const id = (await call(SAL, "POST", "/services", { category: "ناخن", name: "ژل و لاک", price: 850000, durationMin: 90, materials: "ژل", capacity: 3, discountNote: "۱۰٪ اولین بار", commissionPct: 55, staffIds: [staffA] })).body.data.id;
    await call(SAL, "PATCH", `/services/${id}`, { price: 900000 });
    expect((await call(SAL, "GET", `/services/${id}`)).body.data).toMatchObject({ price: 900000, materials: "ژل", capacity: 3, discountNote: "۱۰٪ اولین بار", commissionPct: 55, active: true, staffIds: [staffA] });
    await call(SAL, "DELETE", `/services/${id}`);
  });

  it("updates, deactivates and archives", async () => {
    const u = await call(SAL, "PATCH", `/services/${svc}`, { price: 2_000_000, active: false });
    expect(u.body.data).toMatchObject({ price: 2_000_000, active: false });
    expect((await call(SAL, "GET", "/services?active=1")).body.data.map((s: { name: string }) => s.name)).toEqual(["فیشیال"]);
    expect((await call(SAL, "DELETE", `/services/${svc}`)).status).toBe(200);
    expect((await call(SAL, "GET", `/services/${svc}`)).status).toBe(404);
    expect((await call(SAL, "GET", "/services")).body.data).toHaveLength(1);
  });

  it("an admin acts on a named salon", async () => {
    const r = await call({ role: "SUPER_ADMIN", tenantId: null }, "GET", "/services", undefined, { "x-tenant-id": T.sal });
    expect(r.body.data).toHaveLength(1);
  });
});
