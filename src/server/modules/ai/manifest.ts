import { defineModule } from "../../platform/modules/types";

/** مدیر هوشمند سالن — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const aiModule = defineModule({
  id: "ai",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "مدیر هوشمند سالن",
  description: "پرسش و پاسخ روی داده‌های سالن",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 690000,
  defaultPlans: [],
});
