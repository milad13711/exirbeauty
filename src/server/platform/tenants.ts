import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { conflict, notFound } from "../http/errors";
import { afterPlanChange } from "./modules/entitlements";

/**
 * Provisions a tenant on a plan and installs everything the plan includes.
 * Pass `tx` to make it part of a larger transaction; `months` sets the subscription end (paid purchases).
 */
export async function createTenant(input: { name: string; slug: string; city: string; planCode: string; months?: number }, tx: Prisma.TransactionClient = prisma) {
  const plan = await tx.plan.findUnique({ where: { code: input.planCode }, include: { modules: true } });
  if (!plan || !plan.active) throw notFound("پلن پیدا نشد");
  if (await tx.tenant.findUnique({ where: { slug: input.slug } })) throw conflict("این نشانی قبلاً گرفته شده", "SLUG_TAKEN");
  const installed = afterPlanChange({ oldPlanModuleIds: [], newPlanModuleIds: plan.modules.map((m) => m.moduleId), addonIds: [], installedIds: [] }).installedIds;
  const versions = new Map((await tx.module.findMany({ where: { id: { in: installed } }, select: { id: true, version: true } })).map((m) => [m.id, m.version]));
  const expiresAt = input.months ? new Date(Date.now() + input.months * 30 * 86_400_000) : undefined;
  return tx.tenant.create({
    data: {
      name: input.name, slug: input.slug, city: input.city,
      subscription: { create: { planId: plan.id, status: "ACTIVE", expiresAt } },
      modules: { create: installed.map((moduleId) => ({ moduleId, installed: true, installedVersion: versions.get(moduleId) })) },
    },
    select: { id: true, slug: true },
  });
}

/** The salon's own record plus its subscription, for the settings screen. */
export async function tenantProfile(tenantId: string) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { subscription: { include: { plan: { select: { code: true, title: true, priceMonthly: true } } } } } });
  if (!t) throw notFound("سالن پیدا نشد");
  const sub = t.subscription;
  return {
    id: t.id, name: t.name, slug: t.slug, city: t.city,
    subscription: sub && { planCode: sub.plan.code, planTitle: sub.plan.title, priceMonthly: sub.plan.priceMonthly, status: sub.status, startedAt: sub.startedAt, expiresAt: sub.expiresAt },
  };
}

export async function updateTenantProfile(tenantId: string, p: { name?: string; city?: string }) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { ...(p.name !== undefined ? { name: p.name } : {}), ...(p.city !== undefined ? { city: p.city } : {}) } });
  return tenantProfile(tenantId);
}
