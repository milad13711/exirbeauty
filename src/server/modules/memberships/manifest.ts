import { defineModule } from "../../platform/modules/types";
import { membershipRoutes } from "./routes";
import { onSaleVoided } from "./service";

/** پکیج و عضویت — plans (price, term, included sessions, service discount); selling/renewing goes through the cashier as a real invoice; sessions are used atomically; a voided invoice cancels the membership. Tenant-scoped. */
export const membershipsModule = defineModule({
  id: "memberships",
  version: "1.1.0",
  changelog: "بک‌اند کامل: پلن‌ها، فروش و تمدید از طریق صندوق، مصرف اتمیک جلسه، تخفیف عضویت و لغو با ابطال فاکتور",
  name: "پکیج و عضویت",
  description: "درآمد تکرارشونده با پلن ماهانه",
  category: "درآمد جدید",
  scope: "TENANT",
  addonPrice: 250000,
  requires: ["customers", "cashier"],
  defaultPlans: ["salon"],
  routes: membershipRoutes,
  events: { "sale.voided": onSaleVoided },
});
