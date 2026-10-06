import { defineModule } from "../../platform/modules/types";

/** تعریف خدمات — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const servicesModule = defineModule({
  id: "services",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "تعریف خدمات",
  description: "خدمات، قیمت و مدت",
  category: "هسته",
  scope: "TENANT",
  core: true,
  defaultPlans: ["artist", "salon"],
});
