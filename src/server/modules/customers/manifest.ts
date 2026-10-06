import { defineModule } from "../../platform/modules/types";

/** پروفایل و پرونده‌ی زیبایی مشتری — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const customersModule = defineModule({
  id: "customers",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "پروفایل و پرونده‌ی زیبایی مشتری",
  description: "پرونده‌ی ۳۶۰ درجه‌ی مشتری",
  category: "هسته",
  scope: "TENANT",
  core: true,
  defaultPlans: ["artist", "salon"],
});
