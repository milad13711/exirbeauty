import { defineModule } from "../../platform/modules/types";

/** کمپین و بازاریابی — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const campaignsModule = defineModule({
  id: "campaigns",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "کمپین و بازاریابی",
  description: "ساخت کمپین با شرط‌های ترکیبی مخاطب",
  category: "ارتباط با مشتری",
  scope: "TENANT",
  requires: ["sms"],
  addonPrice: 290000,
  defaultPlans: ["salon"],
});
