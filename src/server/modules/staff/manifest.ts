import { defineModule } from "../../platform/modules/types";
import { staffRoutes } from "./routes";

/** مدیریت متخصص‌ها — CRUD, weekly schedule, leaves, OTP login invite; enforces the plan's staff limit. */
export const staffModule = defineModule({
  id: "staff",
  version: "1.1.1",
  changelog: "ویرایش جزئی فیلدهای ارسال‌نشده را تغییر نمی‌دهد",
  name: "مدیریت متخصص‌ها",
  description: "پرسنل، ساعت کاری و مرخصی",
  category: "هسته",
  scope: "TENANT",
  core: true,
  routes: staffRoutes,
  defaultPlans: ["artist", "salon"],
});
