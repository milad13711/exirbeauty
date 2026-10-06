import { defineModule } from "../../platform/modules/types";

/** باشگاه مشتریان — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const loyaltyModule = defineModule({
  id: "loyalty",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "باشگاه مشتریان",
  description: "سطح، امتیاز و جایزه",
  category: "وفاداری",
  scope: "TENANT",
  addonPrice: 350000,
  defaultPlans: ["salon"],
});
