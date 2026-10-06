import { defineModule } from "../../platform/modules/types";
import { smsRoutes } from "./routes";
import { onAppointmentCreated, onAppointmentMoved, onAppointmentStatus } from "./service";

/** پیامک و سناریوهای خودکار — prepaid credit (Zarinpal top-up), manual send, editable automatic scenarios (confirm/move/cancel/reminders/thanks/birthday), history & stats. Tenant-scoped. */
export const smsModule = defineModule({
  id: "sms",
  version: "1.1.0",
  changelog: "بک‌اند کامل: اعتبار پیش‌پرداخت و شارژ آنلاین، ارسال دستی، سناریوهای خودکار (تأیید، جابه‌جایی، لغو، یادآوری، تشکر، تولد)، تاریخچه و آمار",
  name: "پیامک و سناریوهای خودکار",
  description: "خط اختصاصی، اعتبار لحظه‌ای و ارسال خودکار با کنترل کامل",
  category: "ارتباط با مشتری",
  scope: "TENANT",
  addonPrice: 0,
  defaultPlans: ["artist", "salon"],
  routes: smsRoutes,
  events: { "appointment.created": onAppointmentCreated, "appointment.status": onAppointmentStatus, "appointment.moved": onAppointmentMoved },
});
