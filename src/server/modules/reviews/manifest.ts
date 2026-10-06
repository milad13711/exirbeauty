import { defineModule } from "../../platform/modules/types";

/** نظرسنجی و اعتبار — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const reviewsModule = defineModule({
  id: "reviews",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "نظرسنجی و اعتبار",
  description: "نظرسنجی خودکار بعد از خدمت و مدیریت شکایت",
  category: "ارتباط با مشتری",
  scope: "TENANT",
  addonPrice: 190000,
  defaultPlans: ["artist", "salon"],
});
