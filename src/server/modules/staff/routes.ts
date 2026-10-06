import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { inviteBody, leaveBody, listQuery, staffBody, staffPatch } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const staffRoutes: Route[] = [
  { method: "GET", path: "/staff", auth: STAFF_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query)).all === "1") },
  { method: "POST", path: "/staff", auth: OWNER_UP, handler: async (c) => svc.create(tid(c.tenantId), parse(staffBody, await c.body())) },
  { method: "GET", path: "/staff/:id", auth: STAFF_UP, handler: async (c) => svc.get(tid(c.tenantId), c.params.id) },
  { method: "PATCH", path: "/staff/:id", auth: OWNER_UP, handler: async (c) => svc.update(tid(c.tenantId), c.params.id, parse(staffPatch, await c.body())) },
  { method: "DELETE", path: "/staff/:id", auth: OWNER_UP, handler: async (c) => {
      await svc.deactivate(tid(c.tenantId), c.params.id);
      await audit(c.session, "staff.deactivate", "Staff", c.params.id, { tenantId: c.tenantId });
      return { ok: true };
    } },
  { method: "POST", path: "/staff/:id/leaves", auth: OWNER_UP, handler: async (c) => svc.addLeave(tid(c.tenantId), c.params.id, parse(leaveBody, await c.body())) },
  { method: "DELETE", path: "/staff/:id/leaves/:leaveId", auth: OWNER_UP, handler: async (c) => { await svc.deleteLeave(tid(c.tenantId), c.params.id, c.params.leaveId); return { ok: true }; } },
  { method: "POST", path: "/staff/:id/invite", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.invite(tid(c.tenantId), c.params.id, parse(inviteBody, await c.body()).phone);
      await audit(c.session, "staff.invite", "Staff", c.params.id, { tenantId: c.tenantId });
      return r;
    } },
];
