import { prisma } from "../../db";
import { conflict, forbidden, notFound } from "../../http/errors";
import { MODULES } from "../../modules";
import { afterPlanChange, minPlanFor, resolveEntitlements, type CatalogEntry, type ModuleState } from "./entitlements";

type PlanRow = { id: string; code: string; title: string; sortOrder: number; modules: { moduleId: string }[] };

async function catalog(): Promise<(CatalogEntry & { name: string; category: string; scope: string; price: number; addonPurchasable: boolean; version: string })[]> {
  const rows = await prisma.module.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return rows.map((m) => ({ id: m.id, requires: m.requires, core: m.core, enabled: m.enabled, version: m.version, name: m.name, category: m.category, scope: m.scope, price: m.price, addonPurchasable: m.addonPurchasable }));
}

async function loadTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: { include: { plan: { include: { modules: true } } } }, modules: true },
  });
  if (!tenant) throw notFound("سالن پیدا نشد");
  return tenant;
}

function subscriptionActive(sub: { status: string; expiresAt: Date | null } | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status !== "ACTIVE" && sub.status !== "TRIAL") return false;
  return !sub.expiresAt || sub.expiresAt.getTime() > Date.now();
}

export type TenantEntitlements = {
  tenantId: string;
  plan: { code: string; title: string; limits: unknown } | null;
  subscriptionActive: boolean;
  modules: (ModuleState & { name: string; category: string; scope: string; price: number; addonPurchasable: boolean; version: string; installedVersion: string | null; enabled: boolean; minPlan: string | null })[];
};

export async function getTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  const [tenant, cat, plans] = await Promise.all([loadTenant(tenantId), catalog(), allPlans()]);
  const active = subscriptionActive(tenant.subscription);
  const now = Date.now();
  const states = resolveEntitlements({
    catalog: cat,
    planModuleIds: active ? (tenant.subscription?.plan.modules.map((m) => m.moduleId) ?? []) : [],
    addonIds: active ? tenant.modules.filter((m) => m.addon && (!m.addonUntil || m.addonUntil.getTime() > now)).map((m) => m.moduleId) : [],
    installedIds: tenant.modules.filter((m) => m.installed).map((m) => m.moduleId),
  });
  const planMods = plans.map((p) => ({ code: p.code, sortOrder: p.sortOrder, moduleIds: p.modules.map((m) => m.moduleId) }));
  return {
    tenantId,
    plan: tenant.subscription ? { code: tenant.subscription.plan.code, title: tenant.subscription.plan.title, limits: tenant.subscription.plan.limits } : null,
    subscriptionActive: active,
    modules: cat.map((c) => ({ ...states.get(c.id)!, name: c.name, category: c.category, scope: c.scope, price: c.price, addonPurchasable: c.addonPurchasable, version: c.version, enabled: c.enabled !== false, installedVersion: tenant.modules.find((t) => t.moduleId === c.id)?.installedVersion ?? null, minPlan: minPlanFor(c.id, planMods) })),
  };
}

/** Throws a 403 with an upgrade hint when the tenant can't use the module. */
export async function assertModuleActive(tenantId: string, moduleId: string): Promise<void> {
  const e = await getTenantEntitlements(tenantId);
  if (!e.subscriptionActive) throw forbidden("اشتراک سالن فعال نیست", "SUBSCRIPTION_INACTIVE");
  const m = e.modules.find((x) => x.id === moduleId);
  if (!m) throw notFound("ماژول پیدا نشد");
  if (m.active) return;
  const reason = !m.enabled ? "DISABLED" : !m.available ? "NOT_IN_PLAN" : !m.installed ? "NOT_INSTALLED" : "DEPENDENCY_INACTIVE";
  throw forbidden("این بخش در دسترس سالن شما نیست", "MODULE_NOT_ACTIVE", { moduleId, reason, minPlan: m.minPlan, addonPrice: m.addonPurchasable ? m.price : null, blockedBy: m.blockedBy });
}

export async function allPlans(): Promise<PlanRow[]> {
  return prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { modules: true } });
}

export async function installModule(tenantId: string, moduleId: string): Promise<void> {
  const e = await getTenantEntitlements(tenantId);
  const m = e.modules.find((x) => x.id === moduleId);
  if (!m) throw notFound("ماژول پیدا نشد");
  if (!m.available) throw forbidden("این ماژول در پلن شما نیست", "NOT_IN_PLAN", { minPlan: m.minPlan, addonPrice: m.addonPurchasable ? m.price : null });
  const was = e.modules.find((x) => x.id === moduleId)?.installed;
  await prisma.tenantModule.upsert({ where: { tenantId_moduleId: { tenantId, moduleId } }, create: { tenantId, moduleId, installed: true, installedVersion: m.version }, update: { installed: true, installedVersion: m.version } });
  if (!was) await manifest(moduleId)?.onInstall?.(tenantId);
}

export async function uninstallModule(tenantId: string, moduleId: string): Promise<void> {
  const e = await getTenantEntitlements(tenantId);
  const m = e.modules.find((x) => x.id === moduleId);
  if (!m) throw notFound("ماژول پیدا نشد");
  if (!m.installed) return;
  const cat = await catalog();
  if (cat.find((c) => c.id === moduleId)?.core) throw conflict("ماژول‌های هسته قابل حذف نیستند", "CORE_MODULE");
  const dependents = cat.filter((c) => c.requires.includes(moduleId) && e.modules.find((x) => x.id === c.id)?.installed).map((c) => c.id);
  if (dependents.length) throw conflict("ابتدا ماژول‌های وابسته را حذف کنید", "HAS_DEPENDENTS", { dependents });
  await prisma.tenantModule.update({ where: { tenantId_moduleId: { tenantId, moduleId } }, data: { installed: false } });
  await manifest(moduleId)?.onUninstall?.(tenantId);
}

/** Records an add-on purchase. Payment capture is the integration point for the payment gateway (not built yet). */
export async function purchaseAddon(tenantId: string, moduleId: string, months = 1): Promise<void> {
  const e = await getTenantEntitlements(tenantId);
  const m = e.modules.find((x) => x.id === moduleId);
  if (!m) throw notFound("ماژول پیدا نشد");
  if (!m.addonPurchasable) throw conflict("این ماژول خرید تکی ندارد", "NOT_PURCHASABLE");
  if (m.source === "plan") throw conflict("این ماژول از قبل در پلن شما هست", "ALREADY_IN_PLAN");
  const until = new Date(Date.now() + months * 30 * 86_400_000);
  await prisma.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId, moduleId } },
    create: { tenantId, moduleId, installed: true, installedVersion: m.version, addon: true, addonUntil: until },
    update: { installed: true, installedVersion: m.version, addon: true, addonUntil: until },
  });
}

/** `months` (paid change/renewal): sets/extends the subscription end. Renewing the same plan stacks on the remaining time. */
export async function changePlan(tenantId: string, planCode: string, months?: number): Promise<void> {
  const [tenant, newPlan] = await Promise.all([loadTenant(tenantId), prisma.plan.findUnique({ where: { code: planCode }, include: { modules: true } })]);
  if (!newPlan || !newPlan.active) throw notFound("پلن پیدا نشد");
  const old = tenant.subscription?.plan.modules.map((m) => m.moduleId) ?? [];
  const sub = tenant.subscription;
  const base = sub && sub.planId === newPlan.id && sub.expiresAt && sub.expiresAt.getTime() > Date.now() ? sub.expiresAt.getTime() : Date.now();
  const expiresAt = months ? new Date(base + months * 30 * 86_400_000) : undefined;
  const result = afterPlanChange({
    oldPlanModuleIds: old,
    newPlanModuleIds: newPlan.modules.map((m) => m.moduleId),
    addonIds: tenant.modules.filter((m) => m.addon).map((m) => m.moduleId),
    installedIds: tenant.modules.filter((m) => m.installed).map((m) => m.moduleId),
  });
  await prisma.$transaction([
    prisma.subscription.upsert({ where: { tenantId }, create: { tenantId, planId: newPlan.id, status: "ACTIVE", expiresAt }, update: { planId: newPlan.id, status: "ACTIVE", ...(expiresAt ? { expiresAt } : {}) } }),
    prisma.tenantModule.deleteMany({ where: { tenantId } }),
    prisma.tenantModule.createMany({
      data: [...new Set([...result.installedIds, ...result.addonIds])].map((moduleId) => ({
        tenantId, moduleId, installed: result.installedIds.includes(moduleId), addon: result.addonIds.includes(moduleId),
        addonUntil: tenant.modules.find((m) => m.moduleId === moduleId)?.addonUntil ?? null,
      })),
    }),
  ]);
}

/** Replaces which modules a plan includes (admin). */
export async function setPlanModules(planCode: string, moduleIds: string[]): Promise<void> {
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw notFound("پلن پیدا نشد");
  const known = new Set((await prisma.module.findMany({ select: { id: true } })).map((m) => m.id));
  const unknown = moduleIds.filter((m) => !known.has(m));
  if (unknown.length) throw conflict("ماژول ناشناخته", "UNKNOWN_MODULE", { unknown });
  const ids = [...new Set(moduleIds)];
  await prisma.$transaction([
    prisma.planModule.deleteMany({ where: { planId: plan.id } }),
    prisma.planModule.createMany({ data: ids.map((moduleId) => ({ planId: plan.id, moduleId })) }),
  ]);
}

const manifest = (id: string) => MODULES.find((m) => m.id === id);

// ───────── admin: per-module control ─────────

export async function adminListModules() {
  const rows = await prisma.module.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], include: { plans: { select: { plan: { select: { code: true } } } }, _count: { select: { tenants: true } } } });
  return rows.map(({ plans, _count, ...m }) => ({ ...m, planCodes: plans.map((p) => p.plan.code), tenantCount: _count.tenants }));
}

export async function adminEditModule(id: string, patch: { price?: number; addonPurchasable?: boolean; enabled?: boolean }) {
  const m = await prisma.module.findUnique({ where: { id } });
  if (!m) throw notFound("ماژول پیدا نشد");
  if (m.core && patch.enabled === false && m.scope === "PLATFORM") throw conflict("ماژول پلتفرمی هسته غیرفعال نمی‌شود", "CORE_MODULE");
  return prisma.module.update({ where: { id }, data: patch });
}

export async function moduleVersions(id: string) {
  if (!(await prisma.module.count({ where: { id } }))) throw notFound("ماژول پیدا نشد");
  return prisma.moduleVersion.findMany({ where: { moduleId: id }, orderBy: { releasedAt: "desc" }, select: { version: true, changelog: true, releasedAt: true, checksum: true } });
}
