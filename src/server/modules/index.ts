import type { ModuleManifest } from "../platform/modules/types";
import { catalogModules } from "./_catalog";
import { finderModule } from "./finder/manifest";

/**
 * The module registry. To add a feature: create src/server/modules/<id>/ with a manifest
 * (defineModule), then list it here. Plans, add-ons, entitlement checks and route mounting follow automatically.
 */
export const MODULES: ModuleManifest[] = [finderModule, ...catalogModules];

const ids = MODULES.map((m) => m.id);
if (new Set(ids).size !== ids.length) throw new Error(`Duplicate module id in registry: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(", ")}`);
