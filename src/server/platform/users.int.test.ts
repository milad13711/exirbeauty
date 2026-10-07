// Integration: salon user list, deactivation (immediate revocation), guards.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db";
import { dispatch } from "../http/router";
import { routeTable } from "../routes";
import { signSession } from "./auth/session";

const call = async (who: { userId: string; role: "OWNER" | "STAFF"; tenantId: string } | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("/").filter(Boolean), routeTable);
  return { status: r.status, body: await r.json() };
};
const T: Record<string, string> = {}; const U: Record<string, string> = {};

beforeAll(async () => {
  const stamp = Date.now(), plan = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } });
  for (const k of ["a", "b"]) T[k] = (await prisma.tenant.create({ data: { name: `usr-${k}`, slug: `usr-${k}-${stamp}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  U.ownerA = (await prisma.user.create({ data: { name: "مالک", role: "OWNER", tenantId: T.a, phone: `0916${String(stamp).slice(-7)}` } })).id;
  U.staffA = (await prisma.user.create({ data: { name: "پرسنل", role: "STAFF", tenantId: T.a, phone: `0917${String(stamp).slice(-7)}` } })).id;
  U.ownerB = (await prisma.user.create({ data: { name: "مالک ب", role: "OWNER", tenantId: T.b, phone: `0918${String(stamp).slice(-7)}` } })).id;
});
afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entity: "User", entityId: { in: Object.values(U) } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prisma.tenant.deleteMany({ where: { id: { in: Object.values(T) } } });
});
const owner = () => ({ userId: U.ownerA, role: "OWNER" as const, tenantId: T.a });
const staff = () => ({ userId: U.staffA, role: "STAFF" as const, tenantId: T.a });

describe("salon users", () => {
  it("lists only the salon's own users, owner-only", async () => {
    const r = await call(owner(), "GET", "/tenant/users");
    expect(r.body.data.map((u: { id: string }) => u.id).sort()).toEqual([U.ownerA, U.staffA].sort());
    expect((await call(staff(), "GET", "/tenant/users")).status).toBe(403);
    expect((await call(null, "GET", "/tenant/users")).status).toBe(401);
  });
  it("won't touch yourself, owners, or another salon's users", async () => {
    expect((await call(owner(), "PATCH", `/tenant/users/${U.ownerA}`, { active: false })).status).toBe(409);
    expect((await call(owner(), "PATCH", `/tenant/users/${U.ownerB}`, { active: false })).status).toBe(404);
    expect((await call(owner(), "PATCH", `/tenant/users/${U.staffA}`, {})).status).toBe(422);
  });
  it("deactivating a staff user cuts off their live session at once, and reactivating restores it", async () => {
    expect((await call(staff(), "GET", "/tenant/modules")).status).toBe(200);
    expect((await call(owner(), "PATCH", `/tenant/users/${U.staffA}`, { active: false })).status).toBe(200);
    expect((await call(staff(), "GET", "/tenant/modules")).status).toBe(401);
    expect((await call(owner(), "PATCH", `/tenant/users/${U.staffA}`, { active: true })).status).toBe(200);
    expect((await call(staff(), "GET", "/tenant/modules")).status).toBe(200);
  });
});
