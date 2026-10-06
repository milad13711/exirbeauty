import type { ModuleManifest } from "../platform/modules/types";
import { finderModule } from "./finder/manifest";
import { calendarModule } from "./calendar/manifest";
import { servicesModule } from "./services/manifest";
import { staffModule } from "./staff/manifest";
import { customersModule } from "./customers/manifest";
import { cashierModule } from "./cashier/manifest";
import { inventoryModule } from "./inventory/manifest";
import { reportsModule } from "./reports/manifest";
import { smsModule } from "./sms/manifest";
import { campaignsModule } from "./campaigns/manifest";
import { reviewsModule } from "./reviews/manifest";
import { loyaltyModule } from "./loyalty/manifest";
import { referralModule } from "./referral/manifest";
import { membershipsModule } from "./memberships/manifest";
import { giftcardsModule } from "./giftcards/manifest";
import { shopModule } from "./shop/manifest";
import { portalModule } from "./portal/manifest";
import { contentModule } from "./content/manifest";
import { marketplaceModule } from "./marketplace/manifest";
import { academyModule } from "./academy/manifest";
import { aiModule } from "./ai/manifest";
import { networkModule } from "./network/manifest";

/**
 * The module registry — one folder per module (manifest.ts + routes + services), each versioned independently.
 * To add a feature: create src/server/modules/<id>/manifest.ts with defineModule({...}), import it here,
 * then `npm run modules:sync`. Plans, add-ons, entitlement checks and route mounting follow automatically.
 */
export const MODULES: ModuleManifest[] = [finderModule, calendarModule, servicesModule, staffModule, customersModule, cashierModule, inventoryModule, reportsModule, smsModule, campaignsModule, reviewsModule, loyaltyModule, referralModule, membershipsModule, giftcardsModule, shopModule, portalModule, contentModule, marketplaceModule, academyModule, aiModule, networkModule];

const ids = MODULES.map((m) => m.id);
if (new Set(ids).size !== ids.length) throw new Error(`Duplicate module id in registry: ${ids.filter((x, i) => ids.indexOf(x) !== i).join(", ")}`);
