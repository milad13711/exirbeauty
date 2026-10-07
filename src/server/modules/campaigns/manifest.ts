import { defineModule } from "../../platform/modules/types";
import { campaignRoutes } from "./routes";

/** کمپین و بازاریابی — SMS to an audience chosen by rules (inactivity, tier, birthday month, spend, service), cost preview, scheduling, frequency cap and sales attribution. Tenant-scoped. */
export const campaignsModule = defineModule({
  id: "campaigns",
  version: "1.1.0",
  changelog: "بک‌اند کامل: مخاطب‌یابی با شرط‌های ترکیبی، پیش‌نمایش هزینه، ارسال فوری یا زمان‌بندی‌شده، سقف تعداد پیام به هر مشتری و گزارش فروش منتسب",
  name: "کمپین و بازاریابی",
  description: "ساخت کمپین با شرط‌های ترکیبی مخاطب",
  category: "ارتباط با مشتری",
  scope: "TENANT",
  addonPrice: 290000,
  requires: ["sms", "customers"],
  defaultPlans: ["salon"],
  routes: campaignRoutes,
});
