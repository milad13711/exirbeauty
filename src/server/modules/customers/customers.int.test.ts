// Integration (seeded DB): tenant isolation, roles, module entitlement, search/pagination, import.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const url = `http://localhost/api/v1${path}`;
  const r = await dispatch(new Request(url, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  return { status: r.status, body: await r.json() };
};

const ids: Record<string, string> = {};
let A: Who, B: Who, C: Who, AS: Who;
const mk = (n: string, phone: string, extra = {}) => ({ name: n, phone, ...extra });

beforeAll(async () => {
  const plan = async (code: string) => (await prisma.plan.findUniqueOrThrow({ where: { code } })).id;
  const stamp = Date.now();
  for (const [k, code] of [["a", "artist"], ["b", "salon"], ["c", "free"]] as const) {
    ids[k] = (await prisma.tenant.create({ data: { name: `cust-${k}`, slug: `cust-${k}-${stamp}`, subscription: { create: { planId: await plan(code), status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: ids.a }; AS = { role: "STAFF", tenantId: ids.a }; B = { role: "OWNER", tenantId: ids.b }; C = { role: "OWNER", tenantId: ids.c };
});
afterAll(async () => {
  await prisma.customer.deleteMany({ where: { tenantId: { in: Object.values(ids) } } });
  await prisma.auditLog.deleteMany({ where: { entity: { in: ["Customer", "Tenant"] }, action: { startsWith: "customers." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: Object.values(ids) } } });
});

describe("customers module", () => {
  it("requires login and the module entitlement", async () => {
    expect((await call(null, "GET", "/customers")).status).toBe(401);
    const r = await call(C, "GET", "/customers"); // free plan has no customers module
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("MODULE_NOT_ACTIVE");
  });

  it("creates with normalized phone and beauty profile, and reads the 360 profile back", async () => {
    const r = await call(A, "POST", "/customers", mk("سارا محمدی", "۰۹۱۲۱۱۱۱۱۱۱", { tags: ["VIP"], allergies: ["PPD"], birthDate: "2000-12-05", beauty: { hair: { current: "بلوند", formula: "۳۰ گرم ۷.۳" }, skin: { type: "ترکیبی" } } }));
    expect(r.status).toBe(200);
    expect(r.body.data.phone).toBe("09121111111");
    ids.sara = r.body.data.id;
    const g = await call(A, "GET", `/customers/${ids.sara}`);
    expect(g.body.data).toMatchObject({ name: "سارا محمدی", allergies: ["PPD"], beauty: { hair: { current: "بلوند" } }, stats: { visitCount: 0, totalSpent: 0 } });
    expect(g.body.data.birthDate).toContain("2000-12-05");
  });

  it("a partial update changes only what was sent (no defaults leak back in)", async () => {
    const id = (await call(A, "POST", "/customers", mk("پروفایل کامل", "09121119999", { gender: "MALE", tags: ["VIP", "وفادار"], allergies: ["PPD"], occasions: ["تولد"], note: "عصرها", source: "معرفی", beauty: { hair: { current: "مشکی" } } }))).body.data.id;
    expect((await call(A, "PATCH", `/customers/${id}`, { note: "صبح‌ها" })).status).toBe(200);
    const c = (await call(A, "GET", `/customers/${id}`)).body.data;
    expect(c).toMatchObject({ note: "صبح‌ها", gender: "MALE", tags: ["VIP", "وفادار"], allergies: ["PPD"], occasions: ["تولد"], source: "معرفی", beauty: { hair: { current: "مشکی" } } });
    await call(A, "DELETE", `/customers/${id}`);
  });

  it("rejects bad input", async () => {
    expect((await call(A, "POST", "/customers", mk("x", "09121111111"))).status).toBe(422); // name too short
    expect((await call(A, "POST", "/customers", mk("نام خوب", "123"))).status).toBe(422);
    expect((await call(A, "POST", "/customers", mk("نام خوب", "09121111112", { birthDate: "5 Dec" }))).status).toBe(422);
    expect((await call(A, "POST", "/customers", mk("نام خوب", "09121111112", { tags: Array(30).fill("t") }))).status).toBe(422);
  });

  it("phone is unique within a salon but the same number can exist in another salon", async () => {
    const dup = await call(A, "POST", "/customers", mk("دیگری", "09121111111"));
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("PHONE_TAKEN");
    expect((await call(B, "POST", "/customers", mk("سارا در سالن ب", "09121111111"))).status).toBe(200);
  });

  it("never exposes one salon's customers to another", async () => {
    expect((await call(B, "GET", `/customers/${ids.sara}`)).status).toBe(404);
    expect((await call(B, "PATCH", `/customers/${ids.sara}`, { name: "هک شده" })).status).toBe(404);
    expect((await call(B, "DELETE", `/customers/${ids.sara}`)).status).toBe(404);
    expect((await call(B, "POST", `/customers/${ids.sara}/visits`, { at: new Date().toISOString(), service: "x" })).status).toBe(404);
    const listB = await call(B, "GET", "/customers");
    expect(listB.body.data.items.map((c: { name: string }) => c.name)).toEqual(["سارا در سالن ب"]);
    // a tenant user can't redirect themselves to another tenant with the admin header
    const sneaky = await call(B, "GET", "/customers", undefined, { "x-tenant-id": ids.a });
    expect(sneaky.body.data.items.map((c: { name: string }) => c.name)).toEqual(["سارا در سالن ب"]);
    expect((await call(A, "GET", `/customers/${ids.sara}`)).body.data.name).toBe("سارا محمدی"); // untouched
  });

  it("a referrer must belong to the same salon", async () => {
    const other = (await call(B, "POST", "/customers", mk("معرف سالن ب", "09121111113"))).body.data.id;
    expect((await call(A, "POST", "/customers", mk("ارجاعی", "09121111114", { referredById: other }))).status).toBe(400);
    expect((await call(A, "POST", "/customers", mk("ارجاعی", "09121111114", { referredById: ids.sara }))).status).toBe(200);
  });

  it("staff can read/write but only owners can delete", async () => {
    expect((await call(AS, "PATCH", `/customers/${ids.sara}`, { note: "عصرها" })).status).toBe(200);
    expect((await call(AS, "DELETE", `/customers/${ids.sara}`)).status).toBe(403);
    expect((await call(AS, "POST", "/customers/import", { rows: [mk("x y", "09121110000")] })).status).toBe(403);
  });

  it("searches by name or phone fragment and paginates", async () => {
    for (let i = 0; i < 5; i++) await call(A, "POST", "/customers", mk(`مشتری ${i}`, `0913000000${i}`));
    expect((await call(A, "GET", "/customers?q=سارا")).body.data.items).toHaveLength(1);
    expect((await call(A, "GET", "/customers?q=09130000003")).body.data.items[0].name).toBe("مشتری 3");
    const p1 = await call(A, "GET", "/customers?limit=3");
    expect(p1.body.data.items).toHaveLength(3);
    expect(p1.body.data.total).toBe(7);
    const p2 = await call(A, "GET", `/customers?limit=3&cursor=${p1.body.data.nextCursor}`);
    const p3 = await call(A, "GET", `/customers?limit=3&cursor=${p2.body.data.nextCursor}`);
    const all = [...p1.body.data.items, ...p2.body.data.items, ...p3.body.data.items].map((c: { id: string }) => c.id);
    expect(new Set(all).size).toBe(7);
    expect(p3.body.data.nextCursor).toBeNull();
  });

  it("records service history and aggregates it", async () => {
    await call(A, "POST", `/customers/${ids.sara}/visits`, { at: "2026-09-10T10:00:00+03:30", service: "رنگ ریشه", price: 1_800_000, staffName: "مریم" });
    const v2 = await call(A, "POST", `/customers/${ids.sara}/visits`, { at: "2026-09-20T10:00:00+03:30", service: "فیشیال", price: 1_900_000 });
    const g = await call(A, "GET", `/customers/${ids.sara}`);
    expect(g.body.data.stats).toMatchObject({ visitCount: 2, totalSpent: 3_700_000 });
    expect(g.body.data.visits[0].service).toBe("فیشیال"); // newest first
    expect((await call(A, "DELETE", `/customers/${ids.sara}/visits/${v2.body.data.id}`)).status).toBe(200);
    expect((await call(B, "DELETE", `/customers/${ids.sara}/visits/${v2.body.data.id}`)).status).toBe(404);
  });

  it("archiving hides a customer, and re-adding the same phone restores them", async () => {
    const id = (await call(A, "POST", "/customers", mk("برای آرشیو", "09131110000"))).body.data.id;
    expect((await call(A, "DELETE", `/customers/${id}`)).status).toBe(200);
    expect((await call(A, "GET", `/customers/${id}`)).status).toBe(404);
    const back = await call(A, "POST", "/customers", mk("برگشته", "09131110000"));
    expect(back.status).toBe(200);
    expect(back.body.data.id).toBe(id);
    expect((await call(A, "GET", `/customers/${id}`)).body.data.name).toBe("برگشته");
  });

  it("bulk import skips existing and repeated phones and reports them", async () => {
    const r = await call(A, "POST", "/customers/import", { rows: [mk("جدید یک", "09140000001"), mk("جدید دو", "۰۹۱۴۰۰۰۰۰۰۲"), mk("تکراری در فایل", "09140000001"), mk("از قبل بود", "09121111111")] });
    expect(r.body.data.created).toBe(2);
    expect(r.body.data.skipped).toEqual([{ row: 3, phone: "09140000001", reason: "DUPLICATE_IN_FILE" }, { row: 4, phone: "09121111111", reason: "EXISTS" }]);
    expect((await call(A, "GET", `/customers/${ids.sara}`)).body.data.name).toBe("سارا محمدی"); // existing row untouched
    const withAllergy = await call(A, "POST", "/customers/import", { rows: [mk("حساسیت دارد", "09140000009", { allergies: ["PPD"], gender: "MALE" })] });
    expect(withAllergy.body.data.created).toBe(1);
    const imported = (await call(A, "GET", "/customers?q=09140000009")).body.data.items[0];
    expect((await call(A, "GET", `/customers/${imported.id}`)).body.data).toMatchObject({ allergies: ["PPD"], gender: "MALE" });
    expect((await call(A, "POST", "/customers/import", { rows: [] })).status).toBe(422);
  });

  it("an admin acts on a named salon via x-tenant-id", async () => {
    const r = await call({ role: "SUPER_ADMIN", tenantId: null }, "GET", "/customers?q=سارا", undefined, { "x-tenant-id": ids.a });
    expect(r.body.data.items).toHaveLength(1);
    expect((await call({ role: "SUPER_ADMIN", tenantId: null }, "GET", "/customers")).status).toBe(403); // TENANT_REQUIRED
  });
});
