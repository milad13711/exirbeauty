import { z } from "zod";
import type { Route } from "../http/types";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../http/errors";
import { rateLimit } from "../http/ratelimit";
import { parse } from "../http/validate";
import { prisma } from "../db";
import { audit } from "./audit";
import { DUMMY_HASH, verifyPassword } from "./auth/password";
import { clearedSessionCookie, sessionCookie, signSession } from "./auth/session";
import { adminEditModule, adminListModules, changePlan, moduleVersions, getTenantEntitlements, installModule, purchaseAddon, setPlanModules, uninstallModule } from "./modules/service";
import { deleteMedia, ownsMedia, readMedia, saveMedia } from "./media";
import { createTenant, tenantProfile, updateTenantProfile } from "./tenants";
import { paymentRoutes } from "./payments/routes";
import { requestOtp, verifyOtp } from "./auth/otp";
import { digits } from "@/lib/validate";

const ADMIN = { roles: ["ADMIN", "SUPER_ADMIN"] } as const;
const TENANT_MANAGER = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;

function needTenant(tenantId: string | null): string {
  if (!tenantId) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)");
  return tenantId;
}

const phoneField = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));

export const platformRoutes: Route[] = [
  ...paymentRoutes,
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
    method: "POST", path: "/auth/otp/request",
    handler: async (c) => {
      const { phone } = parse(z.object({ phone: phoneField }), await c.body());
      rateLimit(`otp:ip:${c.ip}`, 10, 60 * 60_000);
      rateLimit(`otp:phone:${phone}`, 5, 60 * 60_000);
      return requestOtp(phone);
    },
  },
  {
    method: "POST", path: "/auth/otp/verify",
    handler: async (c) => {
      const { phone, code } = parse(z.object({ phone: phoneField, code: z.string().regex(/^\d{6}$/, "کد ۶ رقمی است") }), await c.body());
      rateLimit(`otpv:ip:${c.ip}`, 30, 10 * 60_000);
      const user = await verifyOtp(phone, code);
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
  {
    method: "PATCH", path: "/auth/me", auth: "user",
    handler: async (c) => {
      const { name } = parse(z.object({ name: z.string().trim().min(2).max(60) }), await c.body());
      const u = await prisma.user.update({ where: { id: c.session!.userId }, data: { name }, select: { id: true, name: true, role: true, tenantId: true } });
      // The cookie carries the display name, so refresh it too.
      c.headers.append("set-cookie", sessionCookie(await signSession({ userId: u.id, role: u.role, tenantId: u.tenantId, name: u.name })));
      return u;
    },
  },

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

  // ── the salon's own profile & subscription
  { method: "GET", path: "/tenant", auth: "user", handler: async (c) => tenantProfile(needTenant(c.tenantId)) },
  {
    method: "PATCH", path: "/tenant", auth: TENANT_MANAGER,
    handler: async (c) => {
      const b = parse(z.object({ name: z.string().trim().min(2).max(80), city: z.string().trim().max(60), brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "رنگ باید به شکل #RRGGBB باشد").transform((c) => c.toLowerCase()).nullable(), logoMediaId: z.string().min(1).max(40).nullable() }).partial().refine((x) => x.name !== undefined || x.city !== undefined || x.brandColor !== undefined || x.logoMediaId !== undefined, "چیزی برای تغییر ارسال نشده"), await c.body());
      if (b.logoMediaId && !(await ownsMedia(needTenant(c.tenantId), b.logoMediaId))) throw badRequest("تصویر پیدا نشد");
      const r = await updateTenantProfile(needTenant(c.tenantId), b);
      await audit(c.session, "tenant.update", "Tenant", c.tenantId!, b);
      return r;
    },
  },

  // ── the salon's own users (owners manage their staff; staff logins are created from the staff screen)
  {
    method: "GET", path: "/tenant/users", auth: TENANT_MANAGER,
    handler: async (c) => (await prisma.user.findMany({ where: { tenantId: needTenant(c.tenantId) }, orderBy: [{ role: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, phone: true, role: true, active: true, createdAt: true, staffProfile: { select: { id: true, name: true } } } }))
      .map(({ staffProfile, ...u }) => ({ ...u, staff: staffProfile })),
  },
  {
    method: "PATCH", path: "/tenant/users/:id", auth: TENANT_MANAGER,
    handler: async (c) => {
      const tenantId = needTenant(c.tenantId);
      const { active } = parse(z.object({ active: z.boolean() }), await c.body());
      const u = await prisma.user.findFirst({ where: { id: c.params.id, tenantId }, select: { id: true, role: true, active: true } });
      if (!u) throw notFound("کاربر پیدا نشد");
      if (u.id === c.session!.userId) throw conflict("نمی‌توانید حساب خودتان را غیرفعال کنید", "SELF");
      if (u.role !== "STAFF") throw forbidden("فقط حساب پرسنل را می‌توان از اینجا غیرفعال کرد");
      await prisma.user.update({ where: { id: u.id }, data: { active } });
      await audit(c.session, active ? "user.activate" : "user.deactivate", "User", u.id, { tenantId });
      return { id: u.id, active };
    },
  },

  // ── uploaded images (logo, before/after photos)
  {
    method: "POST", path: "/media", auth: { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] },
    handler: async (c) => {
      rateLimit(`media:${c.session!.userId}`, 30, 10 * 60_000);
      return saveMedia(needTenant(c.tenantId), parse(z.object({ dataUrl: z.string().min(30).max(1_000_000) }), await c.body()).dataUrl);
    },
  },
  {
    // Public, but the id is an unguessable cuid; only raster images are ever stored, and nosniff keeps them images.
    method: "GET", path: "/media/:id",
    handler: async (c) => {
      const m = await readMedia(c.params.id);
      return new Response(new Uint8Array(m.data), { headers: { "content-type": m.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" } });
    },
  },
  { method: "DELETE", path: "/media/:id", auth: TENANT_MANAGER, handler: async (c) => { await deleteMedia(needTenant(c.tenantId), c.params.id); return { ok: true }; } },

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
  { method: "GET", path: "/admin/modules", auth: ADMIN, handler: async () => adminListModules() },
  { method: "GET", path: "/admin/modules/:id/versions", auth: ADMIN, handler: async (c) => moduleVersions(c.params.id) },
  {
    method: "PATCH", path: "/admin/modules/:id", auth: ADMIN,
    handler: async (c) => {
      const patch = parse(z.object({ price: z.number().int().min(0).max(100_000_000).optional(), addonPurchasable: z.boolean().optional(), enabled: z.boolean().optional() }).strict(), await c.body());
      const r = await adminEditModule(c.params.id, patch);
      await audit(c.session, "module.edit", "Module", c.params.id, patch);
      return { id: r.id, price: r.price, addonPurchasable: r.addonPurchasable, enabled: r.enabled, version: r.version };
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
    method: "POST", path: "/admin/users", auth: ADMIN,
    handler: async (c) => {
      const b = parse(z.object({ name: z.string().trim().min(2).max(60), phone: phoneField, role: z.enum(["OWNER", "STAFF"]), tenantId: z.string().min(1) }), await c.body());
      if (!(await prisma.tenant.count({ where: { id: b.tenantId } }))) throw badRequest("سالن پیدا نشد");
      if (await prisma.user.count({ where: { phone: b.phone } })) throw conflict("این شماره قبلاً ثبت شده", "PHONE_TAKEN");
      const u = await prisma.user.create({ data: b, select: { id: true, name: true, phone: true, role: true, tenantId: true } });
      await audit(c.session, "user.create", "User", u.id, { role: b.role, tenantId: b.tenantId });
      return u;
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
