import { defineModule } from "../../platform/modules/types";
import { customerRoutes } from "./routes";

/** پروفایل و پرونده‌ی زیبایی مشتری — CRUD, search, beauty profile, service history, bulk import. Tenant-scoped. */
export const customersModule = defineModule({
  id: "customers",
  version: "1.1.1",
  changelog: "رفع باگ: ویرایش جزئی دیگر فیلدهای ارسال‌نشده را به مقدار پیش‌فرض برنمی‌گرداند",
  name: "پروفایل و پرونده‌ی زیبایی مشتری",
  description: "پرونده‌ی ۳۶۰ درجه‌ی مشتری",
  category: "هسته",
  scope: "TENANT",
  core: true,
  routes: customerRoutes,
  defaultPlans: ["artist", "salon"],
});
