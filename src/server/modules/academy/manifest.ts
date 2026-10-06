import { defineModule } from "../../platform/modules/types";

/** آکادمی — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const academyModule = defineModule({
  id: "academy",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "آکادمی",
  description: "دوره‌های آموزشی مدیر و متخصص",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 250000,
  defaultPlans: ["salon"],
});
