// Pure entitlement logic (no DB) so it can be unit-tested and reused by the UI later.

export type CatalogEntry = { id: string; requires: string[]; core: boolean; /** global kill switch; defaults to true */ enabled?: boolean };

export type EntitlementInput = {
  catalog: CatalogEntry[];
  planModuleIds: string[];
  /** Currently valid add-on purchases */
  addonIds: string[];
  installedIds: string[];
};

export type ModuleState = {
  id: string;
  available: boolean;
  source: "plan" | "addon" | null;
  installed: boolean;
  active: boolean;
  /** Required modules that are not active (only when available + installed) */
  blockedBy: string[];
};

export function resolveEntitlements(i: EntitlementInput): Map<string, ModuleState> {
  const byId = new Map(i.catalog.map((c) => [c.id, c]));
  const plan = new Set(i.planModuleIds);
  const addons = new Set(i.addonIds);
  const installedSet = new Set(i.installedIds);
  const memo = new Map<string, boolean>();

  const enabled = (id: string) => byId.get(id)?.enabled !== false;
  const available = (id: string) => enabled(id) && (plan.has(id) || addons.has(id));
  const installed = (id: string) => available(id) && (byId.get(id)?.core === true || installedSet.has(id));

  const isActive = (id: string, trail: Set<string>): boolean => {
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    const entry = byId.get(id);
    if (!entry || !installed(id) || trail.has(id)) return false; // unknown, not installed, or dependency cycle
    const next = new Set(trail).add(id);
    const ok = entry.requires.every((r) => isActive(r, next));
    memo.set(id, ok);
    return ok;
  };

  const out = new Map<string, ModuleState>();
  for (const c of i.catalog) {
    const av = available(c.id);
    const inst = installed(c.id);
    const active = isActive(c.id, new Set());
    out.set(c.id, {
      id: c.id,
      available: av,
      source: !enabled(c.id) ? null : plan.has(c.id) ? "plan" : addons.has(c.id) ? "addon" : null,
      installed: inst,
      active,
      blockedBy: av && inst ? c.requires.filter((r) => !isActive(r, new Set([c.id]))) : [],
    });
  }
  return out;
}

/**
 * When a tenant changes plan: modules that just became available are installed automatically,
 * modules no longer available are dropped, and add-ons now covered by the plan stop being billed.
 */
export function afterPlanChange(i: { oldPlanModuleIds: string[]; newPlanModuleIds: string[]; addonIds: string[]; installedIds: string[] }) {
  const prev = new Set(i.oldPlanModuleIds);
  const next = new Set(i.newPlanModuleIds);
  const keptAddons = i.addonIds.filter((a) => !next.has(a));
  const available = new Set([...next, ...keptAddons]);
  const fresh = [...next].filter((m) => !prev.has(m));
  return {
    addonIds: keptAddons,
    installedIds: [...new Set([...i.installedIds.filter((m) => available.has(m)), ...fresh])],
  };
}

/** Cheapest plan (by sortOrder) that includes the module, or null if no plan does (add-on only). */
export function minPlanFor(moduleId: string, plans: { code: string; sortOrder: number; moduleIds: string[] }[]): string | null {
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder).find((p) => p.moduleIds.includes(moduleId))?.code ?? null;
}
