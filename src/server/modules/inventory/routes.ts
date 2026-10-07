import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { adjustBody, listQuery, productBody, productPatch, receiveBody } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const inventoryRoutes: Route[] = [
  // Staff can see stock and receive deliveries (so the till can sell products); pricing, edits and corrections are owner-level.
  { method: "GET", path: "/inventory/products", auth: STAFF_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/inventory/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "POST", path: "/inventory/products", auth: OWNER_UP, handler: async (c) => svc.create(tid(c.tenantId), parse(productBody, await c.body())) },
  { method: "PATCH", path: "/inventory/products/:id", auth: OWNER_UP, handler: async (c) => svc.update(tid(c.tenantId), c.params.id, parse(productPatch, await c.body())) },
  { method: "DELETE", path: "/inventory/products/:id", auth: OWNER_UP, handler: async (c) => { await svc.archive(tid(c.tenantId), c.params.id); return { ok: true }; } },
  { method: "POST", path: "/inventory/products/:id/receive", auth: STAFF_UP, handler: async (c) => svc.receive(tid(c.tenantId), c.params.id, parse(receiveBody, await c.body())) },
  { method: "POST", path: "/inventory/products/:id/adjust", auth: OWNER_UP, handler: async (c) => {
      const b = parse(adjustBody, await c.body());
      const r = await svc.adjust(tid(c.tenantId), c.params.id, b);
      await audit(c.session, "inventory.adjust", "Product", c.params.id, { tenantId: c.tenantId, stock: b.stock, note: b.note });
      return r;
    } },
  { method: "GET", path: "/inventory/products/:id/moves", auth: STAFF_UP, handler: async (c) => svc.moves(tid(c.tenantId), c.params.id) },
];
