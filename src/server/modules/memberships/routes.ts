import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { listQuery, planBody, planPatch, sellBody, useBody } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const membershipRoutes: Route[] = [
  // Plans are set up by the owner; the till can read them and sell.
  { method: "GET", path: "/memberships/plans", auth: STAFF_UP, handler: async (c) => svc.listPlans(tid(c.tenantId), c.query.get("active") === "1") },
  { method: "POST", path: "/memberships/plans", auth: OWNER_UP, handler: async (c) => svc.createPlan(tid(c.tenantId), parse(planBody, await c.body())) },
  { method: "PATCH", path: "/memberships/plans/:id", auth: OWNER_UP, handler: async (c) => svc.updatePlan(tid(c.tenantId), c.params.id, parse(planPatch, await c.body())) },
  { method: "DELETE", path: "/memberships/plans/:id", auth: OWNER_UP, handler: async (c) => { await svc.archivePlan(tid(c.tenantId), c.params.id); return { ok: true }; } },

  { method: "GET", path: "/memberships/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "GET", path: "/memberships", auth: STAFF_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/memberships/customers/:id", auth: STAFF_UP, handler: async (c) => svc.customerState(tid(c.tenantId), c.params.id) },
  { method: "POST", path: "/memberships/sell", auth: STAFF_UP, handler: async (c) => {
      const r = await svc.sell(tid(c.tenantId), c.session!, parse(sellBody, await c.body()));
      await audit(c.session, "membership.sell", "Membership", r.membership.id, { tenantId: c.tenantId, renewed: r.renewed });
      return r;
    } },
  { method: "POST", path: "/memberships/:id/use", auth: STAFF_UP, handler: async (c) => svc.useSession(tid(c.tenantId), c.params.id, parse(useBody, await c.body()).note) },
  { method: "POST", path: "/memberships/:id/cancel", auth: OWNER_UP, handler: async (c) => {
      await svc.cancel(tid(c.tenantId), c.params.id);
      await audit(c.session, "membership.cancel", "Membership", c.params.id, { tenantId: c.tenantId });
      return { ok: true };
    } },
];
