import { defineModule } from "../../platform/modules/types";
import { finderRoutes } from "./routes";

/** Public map directory: self-serve listings, reviews, appointment requests, admin moderation. Platform-scoped (no tenant). */
export const finderModule = defineModule({
  id: "finder",
  version: "1.2.0",
  changelog: "فعال‌سازی پنل با پرداخت: ساخت سالن، ورود مالک و متخصص‌های قابل رزرو؛ نمایش زنده‌ی متخصص‌ها و لینک رزرو روی نقشه",
  name: "اکسیریاب (نقشه‌ی متخصص‌ها)",
  description: "پروفایل عمومی روی نقشه، نظر مشتری و درخواست نوبت",
  category: "رشد",
  scope: "PLATFORM",
  core: true,
  addonPurchasable: false,
  defaultPlans: ["free", "artist", "salon"],
  routes: finderRoutes,
});
