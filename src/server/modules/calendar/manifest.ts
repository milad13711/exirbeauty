import { defineModule } from "../../platform/modules/types";

/** نوبت‌دهی و تقویم — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const calendarModule = defineModule({
  id: "calendar",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "نوبت‌دهی و تقویم",
  description: "تقویم، رزرو آنلاین، لیست انتظار",
  category: "هسته",
  scope: "TENANT",
  core: true,
  defaultPlans: ["artist", "salon"],
});
