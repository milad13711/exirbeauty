import { defineModule } from "../../platform/modules/types";
import { referralRoutes } from "./routes";
import { onReferralCode, onSaleCreated } from "./service";

/** معرفی دوستان — each customer gets an invite code; a friend booking through it is attached to the referrer, and the referrer earns loyalty points on the friend's first invoice (once). Tenant-scoped. */
export const referralModule = defineModule({
  id: "referral",
  version: "1.1.0",
  changelog: "بک‌اند کامل: کد معرفی هر مشتری، ثبت دوست از لینک رزرو، پاداش امتیازی یک‌باره پس از اولین فاکتور دوست و پیشنهاد تخفیف در صندوق",
  name: "معرفی دوستان",
  description: "لینک اختصاصی و پاداش معرفی",
  category: "وفاداری",
  scope: "TENANT",
  addonPrice: 250000,
  requires: ["customers", "loyalty", "calendar"],
  defaultPlans: ["salon"],
  routes: referralRoutes,
  events: { "referral.code": onReferralCode, "sale.created": onSaleCreated },
});
