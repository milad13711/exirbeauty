import { defineModule } from "../../platform/modules/types";
import { loyaltyRoutes } from "./routes";
import { onSaleCreated, onSaleVoided } from "./service";

/** باشگاه مشتریان — tiers, points earned on invoices, rewards, cashback and a wallet usable as a cashier payment method. Tenant-scoped. */
export const loyaltyModule = defineModule({
  id: "loyalty",
  version: "1.1.2",
  changelog: "فروش کارت هدیه و مبلغ پرداخت‌شده با کارت هدیه امتیاز و بازگشت وجه ندارد",
  name: "باشگاه مشتریان",
  description: "سطح، امتیاز و جایزه",
  category: "وفاداری",
  scope: "TENANT",
  addonPrice: 350000,
  requires: ["customers"],
  defaultPlans: ["salon"],
  routes: loyaltyRoutes,
  events: { "sale.created": onSaleCreated, "sale.voided": onSaleVoided },
});
