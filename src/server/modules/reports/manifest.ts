import { defineModule } from "../../platform/modules/types";
import { reportsRoutes } from "./routes";

/** گزارش‌ها — today's dashboard roll-up (sales, appointments, load, customers, service profitability, opportunities). Excel export and period reports come later. Tenant-scoped. */
export const reportsModule = defineModule({
  id: "reports",
  version: "1.1.0",
  changelog: "داشبورد زنده: فروش امروز، نوبت‌ها، ظرفیت، مشتریان، سودآوری خدمات و فرصت‌ها از داده‌ی واقعی",
  name: "گزارش‌ها و خروجی Excel",
  description: "گزارش فروش، خدمات، متخصص و مشتری",
  category: "عملیات",
  scope: "TENANT",
  addonPrice: 250000,
  requires: ["cashier", "calendar", "customers"],
  defaultPlans: ["artist", "salon"],
  routes: reportsRoutes,
});
