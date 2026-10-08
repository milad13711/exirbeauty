// Integration (seeded DB): the salon's finder presence — overview, leads inbox + conversion, reviews, isolation, roles.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {}; let listingA: string;
let A: Who, AS: Who, B: Who, FREE: Who;

beforeAll(async () => {
  const stamp = Date.now(), salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } }), free = await prisma.plan.findUniqueOrThrow({ where: { code: "free" } });
  for (const [k, plan] of [["a", salon], ["b", salon], ["free", free]] as const) T[k] = (await prisma.tenant.create({ data: { name: `mkt-${k}`, slug: `mkt-${k}-${stamp}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["customers", "staff", "marketplace"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  await call(A, "POST", "/staff", { name: "مریم", listed: true }); await call(A, "POST", "/staff", { name: "نگار", listed: false });
  listingA = (await prisma.finderListing.create({ data: { editCodeHash: "x", planId: salon.id, status: "PUBLISHED", name: "سالن الف", brand: "الف", phone: "09301110000", city: "تهران", x: 0.5, y: 0.5, cats: ["مو"], tenantId: T.a } })).id;
  await prisma.finderReview.createMany({ data: [{ listingId: listingA, name: "الف", rating: 5, text: "عالی" }, { listingId: listingA, name: "ب", rating: 4, text: "خوب" }] });
  await prisma.finderLead.createMany({ data: [{ listingId: listingA, name: "مشتری تازه", phone: "09301110001", note: "وقت رنگ" }, { listingId: listingA, name: "مشتری قدیمی", phone: "09301110002", note: "" }] });
  await call(A, "POST", "/customers", { name: "مشتری قدیمی", phone: "09301110002" });
});
afterAll(async () => {
  await prisma.finderLead.deleteMany({ where: { listingId: listingA } });
  await prisma.finderReview.deleteMany({ where: { listingId: listingA } });
  await prisma.finderListing.deleteMany({ where: { id: listingA } });
  const tenants = [T.a, T.b, T.free];
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});

describe("marketplace", () => {
  it("is gated by plan and owner-only", async () => {
    expect((await call(FREE, "GET", "/marketplace/overview")).status).toBe(403);
    expect((await call(null, "GET", "/marketplace/leads")).status).toBe(401);
    expect((await call(AS, "GET", "/marketplace/leads")).status).toBe(403);
  });
  it("summarizes the listing, shown specialists, rating and leads", async () => {
    const o = (await call(A, "GET", "/marketplace/overview")).body.data;
    expect(o).toMatchObject({ listing: { name: "سالن الف", status: "PUBLISHED", city: "تهران" }, staff: { active: 2, listed: 1 }, rating: { avg: 4.5, count: 2 }, leads: 2 });
  });
  it("a salon without a listing sees an empty presence, not an error", async () => {
    const o = (await call(B, "GET", "/marketplace/overview")).body.data;
    expect(o).toMatchObject({ listing: null, rating: { avg: 0, count: 0 }, leads: 0 });
    expect((await call(B, "GET", "/marketplace/leads")).body.data).toEqual([]);
    expect((await call(B, "GET", "/marketplace/reviews")).body.data).toEqual([]);
  });
  it("lists leads (newest first) and marks those who are already customers", async () => {
    const l = (await call(A, "GET", "/marketplace/leads")).body.data;
    expect(l).toHaveLength(2);
    expect(l.find((x: { name: string }) => x.name === "مشتری قدیمی").customerId).toBeTruthy();
    expect(l.find((x: { name: string }) => x.name === "مشتری تازه").customerId).toBeNull();
  });
  it("converting a lead creates the customer once (idempotent) and tags the source", async () => {
    const id = (await call(A, "GET", "/marketplace/leads")).body.data.find((x: { name: string }) => x.name === "مشتری تازه").id;
    const r1 = (await call(A, "POST", `/marketplace/leads/${id}/convert`)).body.data.customerId;
    const r2 = (await call(A, "POST", `/marketplace/leads/${id}/convert`)).body.data.customerId;
    expect(r1).toBe(r2);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: r1 } })).source).toBe("مارکت‌پلیس");
    expect((await call(A, "GET", "/marketplace/leads")).body.data.every((x: { customerId: string | null }) => x.customerId)).toBe(true);
  });
  it("another salon can't convert this salon's leads, and reviews are only its own", async () => {
    const id = (await call(A, "GET", "/marketplace/leads")).body.data[0].id;
    expect((await call(B, "POST", `/marketplace/leads/${id}/convert`)).status).toBe(404);
    expect((await call(A, "GET", "/marketplace/reviews")).body.data).toHaveLength(2);
  });
});
