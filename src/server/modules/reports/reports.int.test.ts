// Integration (seeded DB): dashboard numbers, gating, roles, isolation.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  return { status: r.status, body: await r.json() };
};
const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who;

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `rep-${k}`, slug: `rep-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["customers", "staff", "services", "calendar", "cashier", "reports"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});

describe("dashboard", () => {
  it("is gated by plan and role", async () => {
    expect((await call(FREE, "GET", "/reports/dashboard")).status).toBe(403);
    expect((await call(null, "GET", "/reports/dashboard")).status).toBe(401);
    expect((await call(AS, "GET", "/reports/dashboard")).status).toBe(403);
  });
  it("is all zeros for a new salon", async () => {
    const d = (await call(A, "GET", "/reports/dashboard")).body.data;
    expect(d).toMatchObject({ revenue: 0, invoices: 0, appointments: { total: 0 }, customers: { new: 0, returning: 0 }, opportunities: { debt: 0, inactiveCustomers: 0 } });
    expect(d.week).toHaveLength(7);
    expect(d.deltaVsLastWeek).toBeNull();
  });
  it("rolls up today's sales, customers, services, debt and staff", async () => {
    const staffId = (await call(A, "POST", "/staff", { name: "مریم", commissionPct: 30 })).body.data.id;
    const svcId = (await call(A, "POST", "/services", { category: "مو", name: "رنگ", price: 1_000_000, materialCost: 200_000, durationMin: 60, commissionPct: 30, staffIds: [staffId] })).body.data.id;
    const c1 = (await call(A, "POST", "/customers", { name: "سارا محمدی", phone: "09141110001" })).body.data.id;
    const line = { kind: "SERVICE", refId: svcId, name: "رنگ", qty: 1, price: 1_000_000, staffId };
    await call(A, "POST", "/cashier/sales", { customerId: c1, lines: [line], payments: [{ method: "CASH", amount: 1_000_000 }] });
    await call(A, "POST", "/cashier/sales", { customerId: c1, lines: [line, { kind: "PRODUCT", name: "ماسک", qty: 1, price: 300_000 }], payments: [{ method: "CARD", amount: 800_000 }] });
    const d = (await call(A, "GET", "/reports/dashboard")).body.data;
    expect(d).toMatchObject({ revenue: 2_300_000, invoices: 2, products: 300_000, commission: 600_000 });
    expect(d.customers).toEqual({ new: 1, returning: 0 }); // both invoices are the customer's first day
    expect(d.opportunities.debt).toBe(500_000);
    expect(d.week.at(-1).revenue).toBe(2_300_000);
    expect(d.services[0]).toMatchObject({ name: "رنگ", share: 100, margin: 50 });
    expect(d.topStaff[0]).toMatchObject({ name: "مریم", revenue: 2_000_000 });
  });
  it("another salon sees none of it", async () => {
    const d = (await call(B, "GET", "/reports/dashboard")).body.data;
    expect(d).toMatchObject({ revenue: 0, invoices: 0 });
    expect(d.services).toEqual([]);
  });
});

describe("tenant profile", () => {
  it("shows own profile + subscription and lets the owner (only) edit name and city", async () => {
    const p = (await call(A, "GET", "/tenant")).body.data;
    expect(p).toMatchObject({ id: T.a, subscription: { planCode: "salon", status: "ACTIVE" } });
    expect((await call(AS, "PATCH", "/tenant", { city: "شیراز" })).status).toBe(403);
    expect((await call(A, "PATCH", "/tenant", { name: "سالن نو", city: "شیراز" })).body.data).toMatchObject({ name: "سالن نو", city: "شیراز" });
    expect((await call(A, "PATCH", "/tenant", {})).status).toBe(422);
    expect((await call(A, "PATCH", "/tenant", { name: "x" })).status).toBe(422);
    expect((await call(B, "GET", "/tenant")).body.data.name).toBe("rep-b"); // another salon is untouched
    expect((await call(null, "GET", "/tenant")).status).toBe(401);
  });
});
