import { defineModule } from "../../platform/modules/types";

/** پیامک و سناریوهای خودکار — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const smsModule = defineModule({
  id: "sms",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "پیامک و سناریوهای خودکار",
  description: "خط اختصاصی، اعتبار لحظه‌ای و ارسال خودکار با کنترل کامل",
  category: "ارتباط با مشتری",
  scope: "TENANT",
  addonPrice: 0,
  defaultPlans: ["artist", "salon"],
});
