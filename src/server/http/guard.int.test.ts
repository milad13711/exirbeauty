// Integration: needs the seeded database (npm run db:seed) and AUTH_SECRET. Run with `npm run test:int`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../db";
import { signSession } from "../platform/auth/session";
import { compile, dispatch } from "./router";
import type { Route } from "./types";

const routes: Route[] = [
  { method: "GET", path: "/t/included", auth: "user", module: "zz-guard-addon", handler: async () => "ok" },
  { method: "GET", path: "/t/not-owned", auth: "user", module: "zz-guard-off", handler: async () => "ok" },
  { method: "GET", path: "/t/needs-tenant", auth: "user", module: "zz-guard-addon", handler: async () => "ok" },
];
const table = compile(routes);

let tenantId: string;
const call = async (path: string, session?: { role: "OWNER" | "SUPER_ADMIN"; tenantId: string | null }, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = session ? { cookie: `exir_session=${await signSession({ userId: "u1", name: "t", ...session })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { headers: { ...cookie, ...headers } }), path.split("/").filter(Boolean), table);
  return { status: r.status, body: await r.json() };
};

// These tests need modules they can switch off and on without disturbing the other test files running in parallel,
// so they use two private catalog rows (never real product modules) and a private tenant.
beforeAll(async () => {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } });
  await prisma.module.createMany({ data: [
    { id: "zz-guard-addon", name: "تست", category: "تست", price: 1000 },
    { id: "zz-guard-off", name: "تست ۲", category: "تست", price: 690000 },
  ], skipDuplicates: true });
  tenantId = (await prisma.tenant.create({ data: { name: "guard", slug: `guard-${Date.now()}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  await prisma.tenantModule.create({ data: { tenantId, moduleId: "zz-guard-addon", installed: true, addon: true } });
});
afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.module.deleteMany({ where: { id: { in: ["zz-guard-addon", "zz-guard-off"] } } });
});

describe("module entitlement guard (real DB, a private tenant on the salon plan)", () => {
  it("lets a tenant user into a module their plan includes", async () => {
    expect((await call("/t/included", { role: "OWNER", tenantId })).status).toBe(200);
  });

  it("blocks a module that is add-on only and tells the client how to get it", async () => {
    const r = await call("/t/not-owned", { role: "OWNER", tenantId });
    expect(r.status).toBe(403);
    expect(r.body.error).toMatchObject({ code: "MODULE_NOT_ACTIVE", details: { moduleId: "zz-guard-off", reason: "NOT_IN_PLAN", minPlan: null, addonPrice: 690000 } });
  });

  it("a tenant user cannot act on another tenant via x-tenant-id", async () => {
    const other = await prisma.tenant.create({ data: { name: "other", slug: `other-${Date.now()}` } });
    try {
      // header is ignored for non-admins: still resolves to their own (entitled) tenant
      expect((await call("/t/included", { role: "OWNER", tenantId }, { "x-tenant-id": other.id })).status).toBe(200);
      // an admin naming a tenant with no subscription is refused
      const r = await call("/t/included", { role: "SUPER_ADMIN", tenantId: null }, { "x-tenant-id": other.id });
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe("SUBSCRIPTION_INACTIVE");
    } finally {
      await prisma.tenant.delete({ where: { id: other.id } });
    }
  });

  it("requires a tenant for guarded routes", async () => {
    const r = await call("/t/needs-tenant", { role: "SUPER_ADMIN", tenantId: null });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("TENANT_REQUIRED");
  });

  it("a globally disabled module is blocked for everyone, and comes back when re-enabled", async () => {
    await prisma.module.update({ where: { id: "zz-guard-addon" }, data: { enabled: false } });
    try {
      const r = await call("/t/included", { role: "OWNER", tenantId });
      expect(r.status).toBe(403);
      expect(r.body.error.details.reason).toBe("DISABLED");
    } finally {
      await prisma.module.update({ where: { id: "zz-guard-addon" }, data: { enabled: true } });
    }
    expect((await call("/t/included", { role: "OWNER", tenantId })).status).toBe(200);
  });
});
