import { defineModule } from "../../platform/modules/types";
import { shopRoutes } from "./routes";

/** فروشگاه و پورسانت — the platform's online store: public storefront with Zarinpal checkout, orders fulfilled by the platform team, and commission credited to the salon whose link the order came through after the return window; the salon's wallet can pay a plan renewal; product recommendations from a customer's last service. Tenant-scoped (the storefront and admin routes are platform-level). */
export const shopModule = defineModule({
  id: "shop",
  version: "1.3.0",
  changelog: "قانون مهلت مرجوعی قابل تنظیم و کمپین پورسانت ویژه",
  name: "فروشگاه و پورسانت",
  description: "فروشگاه اکسیر، لینک معرفی و توصیه‌ی محصول",
  category: "درآمد جدید",
  scope: "TENANT",
  addonPrice: 350000,
  requires: ["customers"],
  defaultPlans: ["salon"],
  routes: shopRoutes,
});
