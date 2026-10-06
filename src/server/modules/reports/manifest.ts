import { defineModule } from "../../platform/modules/types";

/** گزارش‌ها و خروجی Excel — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const reportsModule = defineModule({
  id: "reports",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "گزارش‌ها و خروجی Excel",
  description: "گزارش فروش، خدمات، متخصص و مشتری",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 250000,
  defaultPlans: ["artist", "salon"],
});
