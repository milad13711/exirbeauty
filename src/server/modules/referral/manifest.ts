import { defineModule } from "../../platform/modules/types";

/** معرفی دوستان — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const referralModule = defineModule({
  id: "referral",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "معرفی دوستان",
  description: "لینک اختصاصی و پاداش معرفی",
  category: "وفاداری",
  scope: "TENANT",
  addonPrice: 250000,
  defaultPlans: ["salon"],
});
