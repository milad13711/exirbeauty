import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const reportsRoutes: Route[] = [
  // Money totals are owner-level, like the cashier's own reports.
  { method: "GET", path: "/reports/dashboard", auth: OWNER_UP, handler: async (c) => svc.dashboard(tid(c.tenantId)) },
];
