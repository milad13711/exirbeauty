import { compile } from "./http/router";
import type { Route } from "./http/types";
import { MODULES } from "./modules";
import { platformRoutes } from "./platform/routes";

/**
 * Every route in the system: platform routes + each module's routes.
 * Tenant-scoped module routes are automatically guarded by that module's entitlement,
 * so a handler never has to check the plan itself.
 */
export function allRoutes(): Route[] {
  const fromModules = MODULES.flatMap((m) => (m.routes ?? []).map((r): Route => ({ ...r, module: r.module ?? (m.scope === "TENANT" ? m.id : undefined) })));
  return [...platformRoutes, ...fromModules];
}

export const routeTable = compile(allRoutes());
