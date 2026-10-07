import { defineModule } from "../../platform/modules/types";
import { inventoryRoutes } from "./routes";
import { onSaleCreated, onSaleVoided } from "./service";

/** انبار و تأمین — products (retail/consumable), receiving, corrections, stock ledger, low-stock alerts; invoices deduct stock and voids restore it. Tenant-scoped. */
export const inventoryModule = defineModule({
  id: "inventory",
  version: "1.1.0",
  changelog: "بک‌اند کامل: کالا، ورود کالا، اصلاح موجودی، دفتر حرکت موجودی و هشدار نقطه‌ی سفارش؛ کسر خودکار با فاکتور و برگشت با ابطال",
  name: "انبار و تأمین",
  description: "موجودی، نقطه سفارش و ورود کالا",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 290000,
  requires: ["cashier"],
  defaultPlans: ["salon"],
  routes: inventoryRoutes,
  events: { "sale.created": onSaleCreated, "sale.voided": onSaleVoided },
});
