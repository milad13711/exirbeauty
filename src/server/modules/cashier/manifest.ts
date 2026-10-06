import { defineModule } from "../../platform/modules/types";
import { cashierRoutes } from "./routes";

/** صندوق و درآمد — invoices (split payments, debt), expenses, debt collection, day closing, daily/period report, commissions. Tenant-scoped. */
export const cashierModule = defineModule({
  id: "cashier",
  version: "1.2.0",
  changelog: "پرداخت از کیف پول باشگاه (اتمیک با فاکتور و بازگشت هنگام ابطال) و رویدادهای ایجاد/ابطال فاکتور",
  name: "صندوق و درآمد",
  description: "فاکتور، پرداخت ترکیبی، هزینه، بدهی و بستن روز",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 390000,
  requires: ["customers"],
  routes: cashierRoutes,
  defaultPlans: ["artist", "salon"],
});
