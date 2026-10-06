import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { adjustBody, configBody, membersQuery, redeemBody } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const loyaltyRoutes: Route[] = [
  { method: "GET", path: "/loyalty/config", auth: STAFF_UP, handler: async (c) => svc.getConfig(tid(c.tenantId)) },
  { method: "PUT", path: "/loyalty/config", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.putConfig(tid(c.tenantId), parse(configBody, await c.body()));
      await audit(c.session, "loyalty.config", "LoyaltyConfig", c.tenantId!, { tenantId: c.tenantId });
      return r;
    } },
  { method: "GET", path: "/loyalty/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "GET", path: "/loyalty/members", auth: OWNER_UP, handler: async (c) => svc.members(tid(c.tenantId), parse(membersQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/loyalty/customers/:id", auth: STAFF_UP, handler: async (c) => svc.customerState(tid(c.tenantId), c.params.id) },
  { method: "POST", path: "/loyalty/customers/:id/redeem", auth: STAFF_UP, handler: async (c) => svc.redeem(tid(c.tenantId), c.params.id, parse(redeemBody, await c.body()).rewardId) },
  { method: "POST", path: "/loyalty/customers/:id/adjust", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.adjust(tid(c.tenantId), c.params.id, parse(adjustBody, await c.body()));
      await audit(c.session, "loyalty.adjust", "Customer", c.params.id, { tenantId: c.tenantId });
      return r;
    } },
];
