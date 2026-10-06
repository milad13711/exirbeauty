import type { Route } from "../../http/types";
import type { EventMap } from "../events";

export type ModuleManifest = {
  /** Stable id, also the DB primary key (e.g. "cashier") */
  id: string;
  /**
   * Semver of this module. Every change to files in the module's folder must bump it
   * (`npm run modules:bump <id> <patch|minor|major> "note"`); `modules:sync` refuses otherwise.
   */
  version: string;
  /** What changed in this version (shown in the admin version history) */
  changelog: string;
  name: string;
  description: string;
  category: string;
  /** PLATFORM = public / cross-tenant (no tenant context); TENANT = per-salon, routes auto-guarded by entitlement */
  scope: "PLATFORM" | "TENANT";
  /** Always on once available; can't be uninstalled */
  core?: boolean;
  /** Module ids that must be active first */
  requires?: string[];
  /** Add-on price in toman (admin can override in DB). 0 = free */
  addonPrice?: number;
  addonPurchasable?: boolean;
  /** Plan codes that include this module by default (seeded once; admins edit the matrix afterwards) */
  defaultPlans: string[];
  /** Runs when a tenant installs / uninstalls this module (seed defaults, clean up, …). Independent per module. */
  onInstall?: (tenantId: string) => Promise<void>;
  onUninstall?: (tenantId: string) => Promise<void>;
  /** HTTP routes mounted under /api/v1. Tenant-scoped modules get the entitlement guard automatically. */
  routes?: Route[];
  /** Reactions to events other modules emit (see platform/events.ts); run only while this module is active for the tenant. */
  events?: EventMap;
};

export const defineModule = (m: ModuleManifest): ModuleManifest => m;
