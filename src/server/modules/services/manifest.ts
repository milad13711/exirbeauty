import { defineModule } from "../../platform/modules/types";
import { serviceRoutes } from "./routes";

/** تعریف خدمات — CRUD, staff assignment, archive. Tenant-scoped. */
export const servicesModule = defineModule({
  id: "services",
  version: "1.1.1",
  changelog: "ویرایش جزئی فیلدهای ارسال‌نشده را تغییر نمی‌دهد",
  name: "تعریف خدمات",
  description: "خدمات، قیمت و مدت",
  category: "هسته",
  scope: "TENANT",
  core: true,
  requires: ["staff"],
  routes: serviceRoutes,
  defaultPlans: ["artist", "salon"],
});
