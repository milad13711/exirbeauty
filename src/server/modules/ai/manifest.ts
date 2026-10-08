import { defineModule } from "../../platform/modules/types";
import { aiRoutes } from "./routes";

/** مدیر هوشمند سالن — a rule-based assistant (no language model): it understands a fixed set of questions and answers them with live numbers from sales, calendar, customers, debts and stock. Owner-only. Tenant-scoped. */
export const aiModule = defineModule({
  id: "ai",
  version: "1.1.0",
  changelog: "دستیار قانون‌محور روی داده‌ی زنده: افت فروش، ظرفیت خالی، مشتریان نیازمند پیگیری، سودآوری خدمات، بدهی، موجودی و متخصص برتر",
  name: "مدیر هوشمند سالن",
  description: "پرسش و پاسخ روی داده‌های سالن",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 690000,
  requires: ["cashier", "calendar", "customers"],
  defaultPlans: [],
  routes: aiRoutes,
});
