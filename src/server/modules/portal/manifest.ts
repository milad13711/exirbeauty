import { defineModule } from "../../platform/modules/types";
import { portalRoutes } from "./routes";

/** پنل و اپ مشتری — customers sign in with an SMS code (scoped to one salon), see and cancel their appointments, and view their points, wallet, invite link and membership. A separate CUSTOMER session that can't reach any staff route. Tenant-scoped. */
export const portalModule = defineModule({
  id: "portal",
  version: "1.1.0",
  changelog: "بک‌اند کامل: ورود مشتری با کد پیامکی مخصوص هر سالن، ثبت‌نام اولین‌بار، نوبت‌ها و لغو در مهلت، امتیاز، کیف پول، لینک معرفی و عضویت",
  name: "پنل و اپ مشتری",
  description: "ورود مشتری، نوبت‌ها، امتیاز و کیف پول",
  category: "مشتری",
  scope: "TENANT",
  addonPrice: 450000,
  requires: ["customers", "calendar"],
  defaultPlans: ["artist", "salon"],
  routes: portalRoutes,
});
