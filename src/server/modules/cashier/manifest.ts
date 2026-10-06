import { defineModule } from "../../platform/modules/types";
import { cashierRoutes } from "./routes";

/** صندوق و درآمد — invoices (split payments, debt), expenses, debt collection, day closing, daily/period report, commissions. Tenant-scoped. */
export const cashierModule = defineModule({
  id: "cashier",
  version: "1.1.0",
  changelog: "بک‌اند کامل: فاکتور با پرداخت ترکیبی و بدهی، هزینه، دریافت بدهی، بستن روز، گزارش و پورسانت",
  name: "صندوق و درآمد",
  description: "فاکتور، پرداخت ترکیبی، هزینه، بدهی و بستن روز",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 390000,
  requires: ["customers"],
  routes: cashierRoutes,
  defaultPlans: ["artist", "salon"],
});
