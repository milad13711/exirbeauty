import { defineModule } from "../../platform/modules/types";

/** مارکت‌پلیس متخصص‌ها — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const marketplaceModule = defineModule({
  id: "marketplace",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "مارکت‌پلیس متخصص‌ها",
  description: "پروفایل عمومی و جذب مشتری جدید",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 390000,
  defaultPlans: ["salon"],
});
