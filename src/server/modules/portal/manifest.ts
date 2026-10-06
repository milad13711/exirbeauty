import { defineModule } from "../../platform/modules/types";

/** پنل و اپ مشتری — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const portalModule = defineModule({
  id: "portal",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "پنل و اپ مشتری",
  description: "ورود مشتری، نوبت‌ها، امتیاز و کیف پول",
  category: "مشتری",
  scope: "TENANT",
  addonPrice: 450000,
  defaultPlans: ["artist", "salon"],
});
