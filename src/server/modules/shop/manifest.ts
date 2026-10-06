import { defineModule } from "../../platform/modules/types";

/** فروشگاه و پورسانت — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const shopModule = defineModule({
  id: "shop",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "فروشگاه و پورسانت",
  description: "فروشگاه اکسیر، لینک معرفی و توصیه‌ی محصول",
  category: "درآمد جدید",
  scope: "TENANT",
  addonPrice: 350000,
  defaultPlans: ["salon"],
});
