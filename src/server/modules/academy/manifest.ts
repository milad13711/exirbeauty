import { defineModule } from "../../platform/modules/types";
import { academyRoutes } from "./routes";

/** آکادمی — platform-run courses for owners and specialists: free, included in a plan, or paid online (Zarinpal); lesson text only for enrolled people; per-person progress and a completion certificate. Tenant-scoped. */
export const academyModule = defineModule({
  id: "academy",
  version: "1.1.0",
  changelog: "بک‌اند کامل: کاتالوگ دوره‌ها (مدیریت توسط تیم اکسیر)، ثبت‌نام رایگان/شامل پلن/پولی با درگاه، متن درس فقط برای ثبت‌نام‌شدگان، پیشرفت فردی و گواهی",
  name: "آکادمی",
  description: "دوره‌های آموزشی مدیر و متخصص",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 250000,
  defaultPlans: ["salon"],
  routes: academyRoutes,
});
