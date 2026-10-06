import { defineModule } from "../../platform/modules/types";

/** پکیج و عضویت — backend routes not built yet; entitlements (plans, add-on, install, deps) already apply. */
export const membershipsModule = defineModule({
  id: "memberships",
  version: "1.0.0",
  changelog: "انتشار اولیه (فقط تعریف ماژول و دسترسی‌ها)",
  name: "پکیج و عضویت",
  description: "درآمد تکرارشونده با پلن ماهانه",
  category: "درآمد جدید",
  scope: "TENANT",
  addonPrice: 250000,
  defaultPlans: ["salon"],
});
