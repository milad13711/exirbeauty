import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { configBody } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const referralRoutes: Route[] = [
  { method: "GET", path: "/referral/config", auth: STAFF_UP, handler: async (c) => svc.getConfig(tid(c.tenantId)) },
  { method: "PUT", path: "/referral/config", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.putConfig(tid(c.tenantId), parse(configBody, await c.body()));
      await audit(c.session, "referral.config", "ReferralConfig", c.tenantId!, r);
      return r;
    } },
  { method: "GET", path: "/referral/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  // The till asks this for a customer: their invite code, and whether a first-invoice discount applies.
  { method: "GET", path: "/referral/customers/:id", auth: STAFF_UP, handler: async (c) => svc.customerState(tid(c.tenantId), c.params.id) },
];
