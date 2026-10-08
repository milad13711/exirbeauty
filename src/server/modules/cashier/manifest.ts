import { defineModule } from "../../platform/modules/types";
import { cashierRoutes } from "./routes";

/** صندوق و درآمد — invoices (split payments, debt), expenses, debt collection, day closing, daily/period report, commissions. Tenant-scoped. */
export const cashierModule = defineModule({
  id: "cashier",
  version: "1.3.0",
  changelog: "پرداخت با کارت هدیه (کسر اتمیک با فاکتور، برگشت با ابطال)، فروش کارت هدیه به‌عنوان بدهی نه درآمد",
  name: "صندوق و درآمد",
  description: "فاکتور، پرداخت ترکیبی، هزینه، بدهی و بستن روز",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 390000,
  requires: ["customers"],
  routes: cashierRoutes,
  defaultPlans: ["artist", "salon"],
});
