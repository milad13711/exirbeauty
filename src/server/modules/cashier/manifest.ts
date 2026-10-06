import { defineModule } from "../../platform/modules/types";

/** صندوق و درآمد — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const cashierModule = defineModule({
  id: "cashier",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "صندوق و درآمد",
  description: "فاکتور، پرداخت ترکیبی، هزینه، بدهی و بستن روز",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 390000,
  defaultPlans: ["artist", "salon"],
});
