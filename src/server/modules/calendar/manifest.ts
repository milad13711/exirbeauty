import { defineModule } from "../../platform/modules/types";
import { calendarRoutes } from "./routes";

/** نوبت‌دهی و تقویم — availability, race-safe booking, status flow, move, waitlist, public online booking. Tenant-scoped. */
export const calendarModule = defineModule({
  id: "calendar",
  version: "1.2.2",
  changelog: "کد معرفی در رزرو آنلاین عمومی (رویداد referral.code)",
  name: "نوبت‌دهی و تقویم",
  description: "تقویم، رزرو آنلاین، لیست انتظار",
  category: "هسته",
  scope: "TENANT",
  core: true,
  requires: ["customers", "services", "staff"],
  routes: calendarRoutes,
  defaultPlans: ["artist", "salon"],
});
