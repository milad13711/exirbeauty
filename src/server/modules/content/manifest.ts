import { defineModule } from "../../platform/modules/types";
import { contentRoutes } from "./routes";

/** تولید محتوا — a posting calendar (draft / scheduled / published) with salon context for the caption generator (services, salon name, this month's birthdays). Captions and story cards are generated in the browser; publishing happens on the salon's own social accounts. Tenant-scoped. */
export const contentModule = defineModule({
  id: "content",
  version: "1.2.0",
  changelog: "عکس قبل/بعد برای پست‌ها",
  name: "تولید محتوا",
  description: "کپشن و کارت استوری از عکس‌های قبل/بعد",
  category: "رشد",
  scope: "TENANT",
  addonPrice: 290000,
  requires: ["services"],
  defaultPlans: ["artist", "salon"],
  routes: contentRoutes,
});
