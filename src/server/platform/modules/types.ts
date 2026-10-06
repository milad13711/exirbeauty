import type { Route } from "../../http/types";

export type ModuleManifest = {
  /** Stable id, also the DB primary key (e.g. "cashier") */
  id: string;
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
  /** HTTP routes mounted under /api/v1. Tenant-scoped modules get the entitlement guard automatically. */
  routes?: Route[];
};

export const defineModule = (m: ModuleManifest): ModuleManifest => m;
