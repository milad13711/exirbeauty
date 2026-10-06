import { defineModule } from "../../platform/modules/types";

/** تولید محتوا — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const contentModule = defineModule({
  id: "content",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "تولید محتوا",
  description: "کپشن و کارت استوری از عکس‌های قبل/بعد",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 290000,
  defaultPlans: ["artist", "salon"],
});
