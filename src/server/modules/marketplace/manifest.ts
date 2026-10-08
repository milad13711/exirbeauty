import { defineModule } from "../../platform/modules/types";
import { marketplaceRoutes } from "./routes";

/** مارکت‌پلیس متخصص‌ها — the salon's presence on the public finder map: listing status, which specialists are shown (staff "listed"), public reviews, and the inbox of people who asked for the salon (convertible to customers). Tenant-scoped. */
export const marketplaceModule = defineModule({
  id: "marketplace",
  version: "1.1.0",
  changelog: "داشبورد حضور در نقشه: وضعیت لیست، امتیاز و نظرهای عمومی، صندوق درخواست‌های مشتریان جدید و تبدیل آن‌ها به مشتری",
  name: "مارکت‌پلیس متخصص‌ها",
  description: "پروفایل عمومی و جذب مشتری جدید",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 390000,
  requires: ["customers", "staff"],
  defaultPlans: ["salon"],
  routes: marketplaceRoutes,
});
