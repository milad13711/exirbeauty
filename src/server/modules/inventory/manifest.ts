import { defineModule } from "../../platform/modules/types";

/** انبار و تأمین — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const inventoryModule = defineModule({
  id: "inventory",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "انبار و تأمین",
  description: "موجودی، نقطه سفارش و ورود کالا",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 290000,
  defaultPlans: ["salon"],
});
