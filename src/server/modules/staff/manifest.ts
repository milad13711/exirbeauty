import { defineModule } from "../../platform/modules/types";

/** مدیریت متخصص‌ها — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const staffModule = defineModule({
  id: "staff",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "مدیریت متخصص‌ها",
  description: "پرسنل، ساعت کاری و مرخصی",
  category: "هسته",
  scope: "TENANT",
  core: true,
  defaultPlans: ["artist", "salon"],
});
