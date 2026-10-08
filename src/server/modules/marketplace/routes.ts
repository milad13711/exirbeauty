import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const marketplaceRoutes: Route[] = [
  { method: "GET", path: "/marketplace/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "GET", path: "/marketplace/leads", auth: OWNER_UP, handler: async (c) => svc.leads(tid(c.tenantId)) },
  { method: "POST", path: "/marketplace/leads/:id/convert", auth: OWNER_UP, handler: async (c) => svc.convertLead(tid(c.tenantId), c.params.id) },
  { method: "GET", path: "/marketplace/reviews", auth: OWNER_UP, handler: async (c) => svc.reviews(tid(c.tenantId)) },
];
