import { defineModule } from "../../platform/modules/types";

/** کارت هدیه — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const giftcardsModule = defineModule({
  id: "giftcards",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "کارت هدیه",
  description: "صدور و خرج کارت هدیه",
  category: "درآمد جدید",
  scope: "TENANT",
  addonPrice: 190000,
  defaultPlans: ["salon"],
});
