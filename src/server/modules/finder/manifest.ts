import { defineModule } from "../../platform/modules/types";
import { finderRoutes } from "./routes";

/** Public map directory: self-serve listings, reviews, appointment requests, admin moderation. Platform-scoped (no tenant). */
export const finderModule = defineModule({
  id: "finder",
  version: "1.1.0",
  changelog: "ویرایش پروفایل منتشرشده تا تأیید ادمین در انتظار می‌ماند؛ لیست درخواست‌ها برای مالک",
  name: "اکسیریاب (نقشه‌ی متخصص‌ها)",
  description: "پروفایل عمومی روی نقشه، نظر مشتری و درخواست نوبت",
  category: "رشد",
  scope: "PLATFORM",
  core: true,
  addonPurchasable: false,
  defaultPlans: ["free", "artist", "salon"],
  routes: finderRoutes,
});
