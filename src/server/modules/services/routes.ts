import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { assignBody, listQuery, serviceBody, servicePatch } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const serviceRoutes: Route[] = [
  { method: "GET", path: "/services", auth: STAFF_UP, handler: async (c) => {
      const q = parse(listQuery, Object.fromEntries(c.query));
      return svc.list(tid(c.tenantId), { category: q.category, active: q.active === undefined ? undefined : q.active === "1" });
    } },
  { method: "POST", path: "/services", auth: OWNER_UP, handler: async (c) => svc.create(tid(c.tenantId), parse(serviceBody, await c.body())) },
  { method: "GET", path: "/services/:id", auth: STAFF_UP, handler: async (c) => svc.get(tid(c.tenantId), c.params.id) },
  { method: "PATCH", path: "/services/:id", auth: OWNER_UP, handler: async (c) => svc.update(tid(c.tenantId), c.params.id, parse(servicePatch, await c.body())) },
  { method: "PUT", path: "/services/:id/staff", auth: OWNER_UP, handler: async (c) => svc.setStaff(tid(c.tenantId), c.params.id, parse(assignBody, await c.body()).staffIds) },
  { method: "DELETE", path: "/services/:id", auth: OWNER_UP, handler: async (c) => {
      await svc.archive(tid(c.tenantId), c.params.id);
      await audit(c.session, "services.archive", "Service", c.params.id, { tenantId: c.tenantId });
      return { ok: true };
    } },
];
