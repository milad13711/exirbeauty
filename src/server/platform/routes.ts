import { z } from "zod";
import type { Route } from "../http/types";
import { badRequest, unauthorized } from "../http/errors";
import { rateLimit } from "../http/ratelimit";
import { parse } from "../http/validate";
import { prisma } from "../db";
import { audit } from "./audit";
import { DUMMY_HASH, verifyPassword } from "./auth/password";
import { clearedSessionCookie, sessionCookie, signSession } from "./auth/session";
import { changePlan, getTenantEntitlements, installModule, purchaseAddon, setPlanModules, uninstallModule } from "./modules/service";
import { createTenant } from "./tenants";

const ADMIN = { roles: ["ADMIN", "SUPER_ADMIN"] } as const;
const TENANT_MANAGER = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;

function needTenant(tenantId: string | null): string {
  if (!tenantId) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)");
  return tenantId;
}

export const platformRoutes: Route[] = [
  // ── auth
  {
    method: "POST", path: "/auth/login",
    handler: async (c) => {
      rateLimit(`login:${c.ip}`, 10, 10 * 60_000);
      const { email, password } = parse(z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }), await c.body());
      const user = await prisma.user.findUnique({ where: { email } });
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !user.active || !user.passwordHash || !ok) throw unauthorized("ایمیل یا رمز عبور درست نیست");
      const token = await signSession({ userId: user.id, role: user.role, tenantId: user.tenantId, name: user.name });
      c.headers.append("set-cookie", sessionCookie(token));
      return { id: user.id, name: user.name, role: user.role, tenantId: user.tenantId };
    },
  },
  {
    method: "POST", path: "/auth/logout", auth: "user",
    handler: async (c) => { c.headers.append("set-cookie", clearedSessionCookie()); return { ok: true }; },
  },
  { method: "GET", path: "/auth/me", auth: "user", handler: async (c) => c.session },

  // ── public catalog
  {
    method: "GET", path: "/platform/plans",
    handler: async () => {
      const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { modules: { select: { moduleId: true } } } });
      return plans.map((p) => ({ code: p.code, title: p.title, tagline: p.tagline, priceMonthly: p.priceMonthly, limits: p.limits, sortOrder: p.sortOrder, moduleIds: p.modules.map((m) => m.moduleId) }));
    },
  },
  {
    method: "GET", path: "/platform/modules",
    handler: async () => prisma.module.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, description: true, category: true, scope: true, core: true, requires: true, price: true, addonPurchasable: true } }),
  },

  // ── tenant entitlements
  { method: "GET", path: "/tenant/modules", auth: "user", handler: async (c) => getTenantEntitlements(needTenant(c.tenantId)) },
  {
    method: "POST", path: "/tenant/modules/:id/install", auth: TENANT_MANAGER,
    handler: async (c) => { await installModule(needTenant(c.tenantId), c.params.id); await audit(c.session, "module.install", "Tenant", c.tenantId!, { moduleId: c.params.id }); return { ok: true }; },
  },
  {
    method: "POST", path: "/tenant/modules/:id/uninstall", auth: TENANT_MANAGER,
    handler: async (c) => { await uninstallModule(needTenant(c.tenantId), c.params.id); await audit(c.session, "module.uninstall", "Tenant", c.tenantId!, { moduleId: c.params.id }); return { ok: true }; },
  },
  {
    method: "POST", path: "/tenant/modules/:id/addon", auth: TENANT_MANAGER,
    handler: async (c) => {
      const { months } = parse(z.object({ months: z.number().int().min(1).max(12).default(1) }), await c.body());
      await purchaseAddon(needTenant(c.tenantId), c.params.id, months);
      await audit(c.session, "module.addon", "Tenant", c.tenantId!, { moduleId: c.params.id, months });
      return { ok: true };
    },
  },

  // ── admin: plan matrix & tenant provisioning
  {
    method: "PUT", path: "/admin/plans/:code/modules", auth: ADMIN,
    handler: async (c) => {
      const { moduleIds } = parse(z.object({ moduleIds: z.array(z.string().min(1)).max(100) }), await c.body());
      await setPlanModules(c.params.code, moduleIds);
      await audit(c.session, "plan.modules.set", "Plan", c.params.code, { moduleIds });
      return { ok: true };
    },
  },
  {
    method: "POST", path: "/admin/tenants", auth: ADMIN,
    handler: async (c) => {
      const body = parse(z.object({
        name: z.string().trim().min(2).max(80), slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "نشانی فقط حروف کوچک لاتین، عدد و خط تیره"),
        city: z.string().trim().max(40).default(""), planCode: z.string().min(1),
      }), await c.body());
      const t = await createTenant(body);
      await audit(c.session, "tenant.create", "Tenant", t.id, body);
      return t;
    },
  },
  {
    method: "POST", path: "/admin/tenants/:id/plan", auth: ADMIN,
    handler: async (c) => {
      const { planCode } = parse(z.object({ planCode: z.string().min(1) }), await c.body());
      await changePlan(c.params.id, planCode);
      await audit(c.session, "tenant.plan.change", "Tenant", c.params.id, { planCode });
      return { ok: true };
    },
  },
  {
    method: "GET", path: "/admin/audit", auth: ADMIN,
    handler: async (c) => {
      const entity = c.query.get("entity") ?? undefined;
      if (entity && entity.length > 40) throw badRequest("entity نامعتبر");
      return prisma.auditLog.findMany({ where: { entity }, orderBy: { at: "desc" }, take: 100 });
    },
  },
];
