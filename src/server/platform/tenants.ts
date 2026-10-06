import { prisma } from "../db";
import { conflict, notFound } from "../http/errors";
import { afterPlanChange } from "./modules/entitlements";

/** Provisions a tenant on a plan and installs everything the plan includes. */
export async function createTenant(input: { name: string; slug: string; city: string; planCode: string }) {
  const plan = await prisma.plan.findUnique({ where: { code: input.planCode }, include: { modules: true } });
  if (!plan || !plan.active) throw notFound("پلن پیدا نشد");
  if (await prisma.tenant.findUnique({ where: { slug: input.slug } })) throw conflict("این نشانی قبلاً گرفته شده", "SLUG_TAKEN");
  const installed = afterPlanChange({ oldPlanModuleIds: [], newPlanModuleIds: plan.modules.map((m) => m.moduleId), addonIds: [], installedIds: [] }).installedIds;
  const versions = new Map((await prisma.module.findMany({ where: { id: { in: installed } }, select: { id: true, version: true } })).map((m) => [m.id, m.version]));
  return prisma.tenant.create({
    data: {
      name: input.name, slug: input.slug, city: input.city,
      subscription: { create: { planId: plan.id, status: "ACTIVE" } },
      modules: { create: installed.map((moduleId) => ({ moduleId, installed: true, installedVersion: versions.get(moduleId) })) },
    },
    select: { id: true, slug: true },
  });
}
