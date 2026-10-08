import type { Route } from "../../http/types";
import { clientIp, rateLimit } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import { clearedSessionCookie, sessionCookie, signSession } from "../../platform/auth/session";
import { profilePatch, requestBody, verifyBody } from "./schemas";
import * as svc from "./service";

const CUSTOMER = { roles: ["CUSTOMER"] } as const;

export const portalRoutes: Route[] = [
  // Sign-in is public, scoped to one salon by its slug, and throttled per phone and per IP (the SMS costs money).
  { method: "POST", path: "/portal/:slug/otp/request", auth: "public", module: false, handler: async (c) => {
      const { phone } = parse(requestBody, await c.body());
      rateLimit(`pot:ip:${clientIp(c.req)}`, 10, 60 * 60_000);
      rateLimit(`pot:phone:${c.params.slug}:${phone}`, 5, 60 * 60_000);
      return svc.requestLogin(c.params.slug, phone);
    } },
  { method: "POST", path: "/portal/:slug/otp/verify", auth: "public", module: false, handler: async (c) => {
      const b = parse(verifyBody, await c.body());
      rateLimit(`potv:ip:${clientIp(c.req)}`, 30, 10 * 60_000);
      const session = await svc.verifyLogin(c.params.slug, b);
      c.headers.append("set-cookie", sessionCookie(await signSession(session)));
      return { id: session.userId, name: session.name };
    } },
  { method: "POST", path: "/portal/logout", auth: CUSTOMER, module: false, handler: async (c) => { c.headers.append("set-cookie", clearedSessionCookie()); return { ok: true }; } },

  // Signed-in customer. The salon must still offer the portal (module guard) and the customer acts only on their own record.
  { method: "GET", path: "/portal/me", auth: CUSTOMER, handler: async (c) => svc.me(c.session!) },
  { method: "PATCH", path: "/portal/me", auth: CUSTOMER, handler: async (c) => svc.updateProfile(c.session!, parse(profilePatch, await c.body())) },
  { method: "GET", path: "/portal/appointments", auth: CUSTOMER, handler: async (c) => svc.appointments(c.session!) },
  { method: "POST", path: "/portal/appointments/:id/cancel", auth: CUSTOMER, handler: async (c) => svc.cancelAppointment(c.session!, c.params.id) },
  { method: "GET", path: "/portal/rewards", auth: CUSTOMER, handler: async (c) => svc.rewards(c.session!) },
  { method: "POST", path: "/portal/rewards/:id/redeem", auth: CUSTOMER, handler: async (c) => svc.redeemReward(c.session!, c.params.id) },
  { method: "GET", path: "/portal/wallet", auth: CUSTOMER, handler: async (c) => svc.wallet(c.session!) },
  { method: "GET", path: "/portal/invite", auth: CUSTOMER, handler: async (c) => svc.invite(c.session!) },
  { method: "GET", path: "/portal/membership", auth: CUSTOMER, handler: async (c) => svc.membership(c.session!) },
];
