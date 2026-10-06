import { prisma } from "../../db";
import type { ModuleManifest } from "./types";

/**
 * Makes the DB mirror the code manifests. Code owns identity/metadata (name, scope, requires, core);
 * admins own price and the plan matrix, so those are only written on first creation.
 */
export async function syncCatalog(modules: ModuleManifest[]): Promise<{ created: string[]; orphaned: string[] }> {
  const existing = new Set((await prisma.module.findMany({ select: { id: true } })).map((m) => m.id));
  const created: string[] = [];
  for (const m of modules) {
    const meta = { name: m.name, description: m.description, category: m.category, scope: m.scope, core: m.core ?? false, requires: m.requires ?? [], addonPurchasable: m.addonPurchasable ?? true };
    await prisma.module.upsert({ where: { id: m.id }, create: { id: m.id, ...meta, price: m.addonPrice ?? 0 }, update: meta });
    if (!existing.has(m.id)) created.push(m.id);
  }
  const known = new Set(modules.map((m) => m.id));
  return { created, orphaned: [...existing].filter((id) => !known.has(id)) };
}

/** Seeds plan→module defaults for plans that have no modules yet, so admin edits survive re-syncs. */
export async function seedPlanMatrix(modules: ModuleManifest[]): Promise<string[]> {
  const seeded: string[] = [];
  const plans = await prisma.plan.findMany({ include: { _count: { select: { modules: true } } } });
  for (const p of plans) {
    if (p._count.modules > 0) continue;
    const ids = modules.filter((m) => m.defaultPlans.includes(p.code)).map((m) => m.id);
    if (ids.length) await prisma.planModule.createMany({ data: ids.map((moduleId) => ({ planId: p.id, moduleId })) });
    seeded.push(`${p.code}:${ids.length}`);
  }
  return seeded;
}
