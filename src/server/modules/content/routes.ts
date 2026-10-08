import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { postBody, postPatch } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const contentRoutes: Route[] = [
  { method: "GET", path: "/content/context", auth: STAFF_UP, handler: async (c) => svc.context(tid(c.tenantId)) },
  { method: "GET", path: "/content/posts", auth: STAFF_UP, handler: async (c) => svc.list(tid(c.tenantId)) },
  { method: "POST", path: "/content/posts", auth: STAFF_UP, handler: async (c) => svc.create(tid(c.tenantId), parse(postBody, await c.body())) },
  { method: "PATCH", path: "/content/posts/:id", auth: STAFF_UP, handler: async (c) => svc.update(tid(c.tenantId), c.params.id, parse(postPatch, await c.body())) },
  { method: "DELETE", path: "/content/posts/:id", auth: STAFF_UP, handler: async (c) => { await svc.remove(tid(c.tenantId), c.params.id); return { ok: true }; } },
];
