import { defineModule } from "../../platform/modules/types";
import { giftcardRoutes } from "./routes";

/** کارت هدیه — sold through the cashier (a liability, booked as revenue only when spent), redeemed as a cashier payment method; the code is a bearer secret stored only as a hash; balances move atomically with the invoice. Tenant-scoped. */
export const giftcardsModule = defineModule({
  id: "giftcards",
  version: "1.1.0",
  changelog: "بک‌اند کامل: صدور با فاکتور صندوق (بدهی، نه درآمد)، کد محرمانه‌ی هش‌شده، پرداخت در صندوق با کسر اتمیک و برگشت با ابطال، پیامک کد به گیرنده",
  name: "کارت هدیه",
  description: "صدور و خرج کارت هدیه",
  category: "درآمد جدید",
  scope: "TENANT",
  addonPrice: 190000,
  requires: ["cashier"],
  defaultPlans: ["salon"],
  routes: giftcardRoutes,
});
