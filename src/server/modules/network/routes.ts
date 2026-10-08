import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { adminListQuery, adminUpdateBody, requestBody } from "./schemas";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const ADMIN = { roles: ["ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const networkRoutes: Route[] = [
  { method: "GET", path: "/network/categories", auth: OWNER_UP, handler: async () => svc.catalog() },
  { method: "GET", path: "/network/requests", auth: OWNER_UP, handler: async (c) => svc.mine(tid(c.tenantId)) },
  { method: "POST", path: "/network/requests", auth: OWNER_UP, handler: async (c) => svc.request(tid(c.tenantId), parse(requestBody, await c.body())) },

  // The platform team works the queue across all salons.
  { method: "GET", path: "/admin/network/requests", auth: ADMIN, module: false, handler: async (c) => svc.adminList(parse(adminListQuery, Object.fromEntries(c.query)).status) },
  { method: "PATCH", path: "/admin/network/requests/:id", auth: ADMIN, module: false, handler: async (c) => {
      const r = await svc.adminUpdate(c.params.id, parse(adminUpdateBody, await c.body()));
      await audit(c.session, "network.update", "NetworkRequest", c.params.id, { status: r.status });
      return r;
    } },
];
