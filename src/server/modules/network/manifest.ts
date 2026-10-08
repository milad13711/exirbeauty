import { defineModule } from "../../platform/modules/types";
import { networkRoutes } from "./routes";

/** شبکه خدمات جانبی — salons ask the platform's partner network for insurance, equipment, hiring, supplies…; one open request per category; the platform team works the queue. Tenant-scoped. */
export const networkModule = defineModule({
  id: "network",
  version: "1.1.0",
  changelog: "بک‌اند کامل: ثبت درخواست خدمت از شبکه‌ی شرکا (یک درخواست باز در هر دسته)، پیگیری وضعیت و پاسخ، و صف کار تیم اکسیر",
  name: "شبکه خدمات جانبی",
  description: "بیمه، تجهیزات، استخدام و …",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 190000,
  defaultPlans: [], // an add-on: bought separately, in no plan by default
  routes: networkRoutes,
});
