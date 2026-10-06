import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { clientIp, rateLimit } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { availabilityQuery, cancelBody, createBody, listQuery, moveBody, notePatch, publicBook, settingsBody, statusBody, waitBody, waitBook } from "./schemas";
import * as svc from "./service";

// Staff routes get the "calendar" entitlement guard from the registry; public routes opt out (module: false)
// and resolve the salon + check entitlement/plan themselves.
const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };
const pub = { module: false } as const;

export const calendarRoutes: Route[] = [
  { method: "GET", path: "/calendar/settings", auth: STAFF_UP, handler: async (c) => svc.getSettings(tid(c.tenantId)) },
  { method: "PUT", path: "/calendar/settings", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.putSettings(tid(c.tenantId), parse(settingsBody, await c.body()));
      await audit(c.session, "calendar.settings", "Tenant", c.tenantId!);
      return r;
    } },
  { method: "GET", path: "/calendar/availability", auth: STAFF_UP, handler: async (c) => svc.availability(tid(c.tenantId), parse(availabilityQuery, Object.fromEntries(c.query)), { leadMin: -120 }) },

  { method: "GET", path: "/calendar/appointments", auth: STAFF_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query))) },
  { method: "POST", path: "/calendar/appointments", auth: STAFF_UP, handler: async (c) => svc.createByStaff(tid(c.tenantId), parse(createBody, await c.body())) },
  { method: "GET", path: "/calendar/appointments/:id", auth: STAFF_UP, handler: async (c) => svc.get(tid(c.tenantId), c.params.id) },
  { method: "PATCH", path: "/calendar/appointments/:id", auth: STAFF_UP, handler: async (c) => svc.setNote(tid(c.tenantId), c.params.id, parse(notePatch, await c.body()).note) },
  { method: "POST", path: "/calendar/appointments/:id/confirm", auth: STAFF_UP, handler: async (c) => svc.transition(tid(c.tenantId), c.params.id, "CONFIRMED") },
  { method: "POST", path: "/calendar/appointments/:id/status", auth: STAFF_UP, handler: async (c) => svc.transition(tid(c.tenantId), c.params.id, parse(statusBody, await c.body()).status) },
  { method: "POST", path: "/calendar/appointments/:id/cancel", auth: STAFF_UP, handler: async (c) => svc.transition(tid(c.tenantId), c.params.id, "CANCELED", parse(cancelBody, await c.body()).reason) },
  { method: "POST", path: "/calendar/appointments/:id/move", auth: STAFF_UP, handler: async (c) => svc.move(tid(c.tenantId), c.params.id, parse(moveBody, await c.body())) },

  { method: "GET", path: "/calendar/waitlist", auth: STAFF_UP, handler: async (c) => svc.listWait(tid(c.tenantId)) },
  { method: "POST", path: "/calendar/waitlist", auth: STAFF_UP, handler: async (c) => svc.addWait(tid(c.tenantId), parse(waitBody, await c.body())) },
  { method: "DELETE", path: "/calendar/waitlist/:id", auth: STAFF_UP, handler: async (c) => { await svc.cancelWait(tid(c.tenantId), c.params.id); return { ok: true }; } },
  { method: "POST", path: "/calendar/waitlist/:id/book", auth: STAFF_UP, handler: async (c) => svc.bookFromWait(tid(c.tenantId), c.params.id, parse(waitBook, await c.body())) },

  // ── public online booking
  { method: "GET", path: "/public/salons/:slug", ...pub, handler: async (c) => svc.publicSalon(c.params.slug) },
  { method: "GET", path: "/public/salons/:slug/availability", ...pub, handler: async (c) => {
      rateLimit(`pub:avail:${c.ip}`, 120, 10 * 60_000);
      return svc.publicAvailability(c.params.slug, parse(availabilityQuery, Object.fromEntries(c.query)));
    } },
  { method: "POST", path: "/public/salons/:slug/appointments", ...pub, handler: async (c) => {
      const b = parse(publicBook, await c.body());
      rateLimit(`pub:book:ip:${clientIp(c.req)}`, 10, 60 * 60_000);
      rateLimit(`pub:book:phone:${b.phone}`, 5, 24 * 60 * 60_000);
      return svc.publicBook(c.params.slug, b);
    } },
  { method: "POST", path: "/public/salons/:slug/waitlist", ...pub, handler: async (c) => {
      const b = parse(waitBody, await c.body());
      rateLimit(`pub:wait:ip:${c.ip}`, 10, 60 * 60_000);
      return svc.publicWait(c.params.slug, { ...b, staffId: b.staffId ?? null });
    } },
];

