import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { customerBody, customerPatch, importBody, listQuery, visitBody } from "./schemas";
import * as svc from "./service";

// The entitlement guard (module "customers") is attached automatically by the registry.
const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;

const tid = (t: string | null) => {
  if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)");
  return t;
};

export const customerRoutes: Route[] = [
  { method: "GET", path: "/customers", auth: STAFF_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query))) },
  { method: "POST", path: "/customers", auth: STAFF_UP, handler: async (c) => svc.create(tid(c.tenantId), parse(customerBody, await c.body())) },
  { method: "POST", path: "/customers/import", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.importRows(tid(c.tenantId), parse(importBody, await c.body()).rows);
      await audit(c.session, "customers.import", "Tenant", c.tenantId!, { created: r.created, skipped: r.skipped.length });
      return r;
    } },
  { method: "GET", path: "/customers/:id", auth: STAFF_UP, handler: async (c) => svc.get(tid(c.tenantId), c.params.id) },
  { method: "PATCH", path: "/customers/:id", auth: STAFF_UP, handler: async (c) => svc.update(tid(c.tenantId), c.params.id, parse(customerPatch, await c.body())) },
  { method: "DELETE", path: "/customers/:id", auth: OWNER_UP, handler: async (c) => {
      await svc.archive(tid(c.tenantId), c.params.id);
      await audit(c.session, "customers.archive", "Customer", c.params.id, { tenantId: c.tenantId });
      return { ok: true };
    } },
  { method: "POST", path: "/customers/:id/visits", auth: STAFF_UP, handler: async (c) => svc.addVisit(tid(c.tenantId), c.params.id, parse(visitBody, await c.body())) },
  { method: "DELETE", path: "/customers/:id/visits/:visitId", auth: OWNER_UP, handler: async (c) => { await svc.deleteVisit(tid(c.tenantId), c.params.id, c.params.visitId); return { ok: true }; } },
];
