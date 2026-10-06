import { prisma } from "../../db";
import type { ModuleManifest } from "./types";
import { decideRelease, moduleChecksum } from "./versioning";

export type SyncResult = { created: string[]; released: { id: string; version: string }[]; orphaned: string[] };

/**
 * Makes the DB mirror the code manifests and records a ModuleVersion for every release.
 * Code owns identity/metadata (name, scope, requires, core, version); admins own price, enabled and the plan matrix,
 * so those are only written on first creation. Throws (changing nothing) if any module changed without a version bump.
 */
export async function syncCatalog(modules: ModuleManifest[], checksum: (id: string) => string = moduleChecksum): Promise<SyncResult> {
  const existing = new Set((await prisma.module.findMany({ select: { id: true } })).map((m) => m.id));

  // Decide everything first so a bad module can't leave a half-applied sync.
  const plan = [];
  const problems: string[] = [];
  for (const m of modules) {
    const current = { version: m.version, checksum: checksum(m.id) };
    const last = await prisma.moduleVersion.findFirst({ where: { moduleId: m.id }, orderBy: { releasedAt: "desc" } });
    const d = decideRelease(m.id, current, last && { version: last.version, checksum: last.checksum });
    if (d.kind === "error") problems.push(d.message);
    else plan.push({ m, current, d });
  }
  if (problems.length) throw new Error(`Module version check failed:\n  ${problems.join("\n  ")}`);

  const created: string[] = [];
  const released: SyncResult["released"] = [];
  for (const { m, current, d } of plan) {
    const meta = { name: m.name, description: m.description, category: m.category, scope: m.scope, core: m.core ?? false, requires: m.requires ?? [], addonPurchasable: m.addonPurchasable ?? true, version: m.version };
    await prisma.module.upsert({ where: { id: m.id }, create: { id: m.id, ...meta, price: m.addonPrice ?? 0 }, update: meta });
    if (!existing.has(m.id)) created.push(m.id);
    if (d.kind === "new" || d.kind === "release") {
      await prisma.moduleVersion.create({ data: { moduleId: m.id, version: m.version, checksum: current.checksum, changelog: m.changelog } });
      released.push({ id: m.id, version: m.version });
    }
  }
  const known = new Set(modules.map((m) => m.id));
  return { created, released, orphaned: [...existing].filter((id) => !known.has(id)) };
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
