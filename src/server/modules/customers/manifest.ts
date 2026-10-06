import { defineModule } from "../../platform/modules/types";
import { customerRoutes } from "./routes";

/** پروفایل و پرونده‌ی زیبایی مشتری — CRUD, search, beauty profile, service history, bulk import. Tenant-scoped. */
export const customersModule = defineModule({
  id: "customers",
  version: "1.1.0",
  changelog: "بک‌اند کامل: ایجاد/ویرایش/آرشیو، جست‌وجو، پروفایل زیبایی، سابقه‌ی خدمات و ورود گروهی",
  name: "پروفایل و پرونده‌ی زیبایی مشتری",
  description: "پرونده‌ی ۳۶۰ درجه‌ی مشتری",
  category: "هسته",
  scope: "TENANT",
  core: true,
  routes: customerRoutes,
  defaultPlans: ["artist", "salon"],
});
