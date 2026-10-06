import { defineModule } from "../../platform/modules/types";

/** شبکه خدمات جانبی — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const networkModule = defineModule({
  id: "network",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "شبکه خدمات جانبی",
  description: "بیمه، تجهیزات، استخدام و …",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 190000,
  defaultPlans: [],
});
