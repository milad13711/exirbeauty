import { defineModule } from "../../platform/modules/types";
import { reviewRoutes } from "./routes";
import { onSaleCreated } from "./service";

/** نظرسنجی و اعتبار — after a service invoice the customer gets an SMS link to rate it; happy ratings are invited to be public, unhappy ones reach the owner privately; replies, resolution, per-staff scores. Tenant-scoped. */
export const reviewsModule = defineModule({
  id: "reviews",
  version: "1.1.0",
  changelog: "بک‌اند کامل: لینک نظرسنجی پیامکی بعد از فاکتور خدمت، مسیر عمومی/خصوصی بر اساس امتیاز، پاسخ مدیر، پیگیری شکایت و امتیاز متخصص‌ها",
  name: "نظرسنجی و اعتبار",
  description: "نظرسنجی خودکار بعد از خدمت و مدیریت شکایت",
  category: "ارتباط با مشتری",
  scope: "TENANT",
  addonPrice: 190000,
  requires: ["sms", "cashier"],
  defaultPlans: ["artist", "salon"],
  routes: reviewRoutes,
  events: { "sale.created": onSaleCreated },
});
