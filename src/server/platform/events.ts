import type { ModuleManifest } from "./modules/types";
import { assertModuleActive } from "./modules/service";

/**
 * Domain events: a module announces what happened (`appointment.status`, `sale.created`, …) and other modules react,
 * without the announcer knowing who listens. A listener only runs when its module is active for that tenant, and one
 * listener failing never breaks the action that emitted the event (it is logged and swallowed).
 */
export type EventHandler = (tenantId: string, payload: Record<string, unknown>) => Promise<void>;
export type EventMap = Record<string, EventHandler>;

let registry: (() => Promise<ModuleManifest[]>) | null = null;
export const setEventRegistry = (r: (() => Promise<ModuleManifest[]>) | null) => { registry = r; };

export async function emit(name: string, tenantId: string, payload: Record<string, unknown>): Promise<void> {
  // Loaded lazily: the module registry imports the modules, which import this file to emit.
  const modules = await (registry ?? (async () => (await import("../modules")).MODULES))();
  await Promise.allSettled(
    modules.filter((m) => m.events?.[name]).map(async (m) => {
      // Not entitled (plan, install, subscription) → this module simply doesn't hear the event.
      const active = await assertModuleActive(tenantId, m.id).then(() => true, () => false);
      if (!active) return;
      try { await m.events![name](tenantId, payload); } catch (e) { console.error(`[events] ${m.id} failed on ${name}`, e); }
    }),
  );
}
