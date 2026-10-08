// Integration (seeded DB): plans, selling through the cashier, renewal, atomic session use, expiry, cancel/void, discount, isolation, roles.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { addDays, tehranNow } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who;
let c1: string, c2: string, bCust: string, planId: string;
const TODAY = tehranNow().date;
const sell = (customerId: string, payments: unknown[] = [{ method: "CASH", amount: 1_000_000 }], pid = planId, w = AS) => call(w, "POST", "/memberships/sell", { customerId, planId: pid, payments });
const members = async (customerId?: string) => (await call(A, "GET", `/memberships${customerId ? `?customerId=${customerId}` : ""}`)).body.data;

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `mem-${k}`, slug: `mem-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["customers", "cashier", "memberships"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  c1 = (await call(A, "POST", "/customers", { name: "سارا محمدی", phone: "09191110001" })).body.data.id;
  c2 = (await call(A, "POST", "/customers", { name: "نیلوفر صادقی", phone: "09191110002" })).body.data.id;
  bCust = (await call(B, "POST", "/customers", { name: "مشتری ب", phone: "09191110009" })).body.data.id;
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.membershipUse.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.membership.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.membershipPlan.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "membership." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => resetRateLimits());

describe("access & plans", () => {
  it("is gated by plan and role", async () => {
    expect((await call(FREE, "GET", "/memberships/plans")).status).toBe(403);
    expect((await call(null, "GET", "/memberships")).status).toBe(401);
    expect((await call(AS, "POST", "/memberships/plans", { name: "پلن", price: 1, months: 1, credits: 1 })).status).toBe(403);
    expect((await call(AS, "GET", "/memberships/overview")).status).toBe(403);
  });
  it("validates and creates plans; PATCH leaves unsent fields alone", async () => {
    expect((await call(A, "POST", "/memberships/plans", { name: "پلن", price: 0, months: 1, credits: 1 })).status).toBe(422);
    expect((await call(A, "POST", "/memberships/plans", { name: "پلن خوب", price: 1000, months: 0, credits: 1 })).status).toBe(422);
    expect((await call(A, "POST", "/memberships/plans", { name: "پلن خوب", price: 1000, months: 1, credits: 1, discountPct: 90 })).status).toBe(422);
    const r = await call(A, "POST", "/memberships/plans", { name: "Beauty Membership", price: 1_000_000, months: 1, credits: 2, creditLabel: "فیشال", discountPct: 10, perks: ["اولویت رزرو"] });
    expect(r.status).toBe(200);
    planId = r.body.data.id;
    const p = (await call(A, "PATCH", `/memberships/plans/${planId}`, { price: 1_200_000 })).body.data;
    expect(p).toMatchObject({ price: 1_200_000, credits: 2, discountPct: 10, creditLabel: "فیشال", perks: ["اولویت رزرو"], active: true });
    await call(A, "PATCH", `/memberships/plans/${planId}`, { price: 1_000_000 });
  });
});

describe("selling", () => {
  it("creates a real invoice and a membership with the plan's term, sessions and discount", async () => {
    const r = await sell(c1);
    expect(r.status).toBe(200);
    expect(r.body.data.renewed).toBe(false);
    expect(r.body.data.membership).toMatchObject({ planName: "Beauty Membership", credits: 2, creditsTotal: 2, status: "ACTIVE", discountPct: 10, startDate: TODAY, expiryDate: addDays(TODAY, 30) });
    const sale = (await call(A, "GET", `/cashier/sales/${r.body.data.membership.saleId}`)).body.data;
    expect(sale).toMatchObject({ total: 1_000_000, paid: 1_000_000, customerId: c1 });
    expect(sale.lines[0].name).toContain("Beauty Membership");
  });
  it("refuses an unknown customer/plan, an inactive plan, overpayment — and leaves nothing behind", async () => {
    const before = await prisma.membership.count({ where: { tenantId: T.a } });
    expect((await sell("ghost")).status).toBe(400);
    expect((await sell(c2, undefined, "ghost")).status).toBe(404);
    expect((await sell(c2, [{ method: "CASH", amount: 2_000_000 }])).status).toBe(409);
    const off = (await call(A, "POST", "/memberships/plans", { name: "غیرفعال", price: 1000, months: 1, credits: 1, active: false })).body.data.id;
    expect((await sell(c2, [{ method: "CASH", amount: 1000 }], off)).status).toBe(409);
    expect(await prisma.membership.count({ where: { tenantId: T.a } })).toBe(before);
  });
  it("unpaid portions become the customer's debt like any invoice", async () => {
    const r = await sell(c2, [{ method: "CASH", amount: 400_000 }]);
    expect((await call(A, "GET", `/cashier/sales/${r.body.data.membership.saleId}`)).body.data).toMatchObject({ paid: 400_000, debt: 600_000, status: "DEBT" });
  });
  it("renewing a valid membership extends it and adds sessions instead of creating a second one", async () => {
    const r = await sell(c1);
    expect(r.body.data.renewed).toBe(true);
    expect(r.body.data.membership).toMatchObject({ credits: 4, creditsTotal: 4, expiryDate: addDays(TODAY, 60) });
    expect((await members(c1)).filter((m: { status: string }) => m.status === "ACTIVE")).toHaveLength(1);
  });
});

describe("using sessions", () => {
  let id: string;
  beforeAll(async () => { id = (await members(c1))[0].id; });
  it("spends a session, one at a time, and records it", async () => {
    const r = await call(AS, "POST", `/memberships/${id}/use`, { note: "فیشال" });
    expect(r.body.data.credits).toBe(3);
    expect(await prisma.membershipUse.count({ where: { membershipId: id } })).toBe(1);
  });
  it("two tills spending the last sessions never go below zero", async () => {
    const rs = await Promise.all(Array.from({ length: 8 }, () => call(AS, "POST", `/memberships/${id}/use`, {})));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(3); // 3 were left
    expect(rs.filter((r) => r.status === 409)).toHaveLength(5);
    expect((await members(c1))[0].credits).toBe(0);
    expect(await prisma.membershipUse.count({ where: { membershipId: id } })).toBe(4);
  });
  it("an expired membership can't be used, and shows as expired", async () => {
    const m = (await members(c2))[0];
    await prisma.membership.update({ where: { id: m.id }, data: { startDate: new Date(`${addDays(TODAY, -40)}T00:00:00Z`), expiryDate: new Date(`${addDays(TODAY, -10)}T00:00:00Z`) } });
    const r = await call(AS, "POST", `/memberships/${m.id}/use`, {});
    expect(r.status).toBe(409);
    expect(r.body.error.message).toContain("تمام شده");
    expect((await members(c2))[0].status).toBe("EXPIRED");
    expect((await call(A, "GET", "/memberships?status=EXPIRED")).body.data).toHaveLength(1);
  });
  it("an expired membership is replaced (not extended) by a new sale", async () => {
    const r = await sell(c2);
    expect(r.body.data.renewed).toBe(false);
    expect(r.body.data.membership.expiryDate).toBe(addDays(TODAY, 30));
  });
});

describe("cancel, void, discount, overview, isolation", () => {
  it("the till gets the customer's valid membership and its discount", async () => {
    expect((await call(AS, "GET", `/memberships/customers/${c1}`)).body.data).toMatchObject({ discountPct: 10, membership: { planName: "Beauty Membership" } });
    expect((await call(AS, "GET", `/memberships/customers/${bCust}`)).status).toBe(404);
  });
  it("voiding the invoice cancels the membership it sold", async () => {
    const m = (await members(c2)).find((x: { status: string }) => x.status === "ACTIVE");
    expect((await call(A, "POST", `/cashier/sales/${m.saleId}/void`, { reason: "برگشت" })).status).toBe(200);
    expect((await members(c2)).find((x: { id: string }) => x.id === m.id).status).toBe("CANCELED");
    expect((await call(AS, "POST", `/memberships/${m.id}/use`, {})).status).toBe(409);
  });
  it("the owner (only) can cancel; twice is refused", async () => {
    const m = (await members(c1))[0];
    expect((await call(AS, "POST", `/memberships/${m.id}/cancel`)).status).toBe(403);
    expect((await call(A, "POST", `/memberships/${m.id}/cancel`)).status).toBe(200);
    expect((await call(A, "POST", `/memberships/${m.id}/cancel`)).status).toBe(409);
    expect((await call(AS, "GET", `/memberships/customers/${c1}`)).body.data.membership).toBeNull();
  });
  it("reports active members, MRR and sessions left", async () => {
    await sell(c1);
    const o = (await call(A, "GET", "/memberships/overview")).body.data;
    expect(o).toMatchObject({ activeMembers: 1, mrr: 1_000_000, sessionsLeft: 2, plans: 1 });
  });
  it("archiving a plan keeps sold memberships intact", async () => {
    expect((await call(A, "DELETE", `/memberships/plans/${planId}`)).status).toBe(200);
    expect((await call(A, "GET", "/memberships/plans")).body.data.some((p: { id: string }) => p.id === planId)).toBe(false);
    expect((await members(c1)).some((m: { planName: string }) => m.planName === "Beauty Membership")).toBe(true);
    expect((await sell(c1)).status).toBe(404);
  });
  it("another salon sees and touches none of it", async () => {
    expect((await call(B, "GET", "/memberships")).body.data).toHaveLength(0);
    const id = (await members(c1))[0].id;
    expect((await call(B, "POST", `/memberships/${id}/use`, {})).status).toBe(404);
    expect((await call(B, "POST", `/memberships/${id}/cancel`)).status).toBe(404);
    expect((await call(B, "PATCH", `/memberships/plans/${planId}`, { price: 1 })).status).toBe(404);
  });
});
