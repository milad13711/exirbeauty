import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { rateLimit, clientIp } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import { answerBody, configBody, listQuery, replyBody } from "./schemas";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const reviewRoutes: Route[] = [
  // Public survey page: identified only by the secret in the SMS link; throttled per IP.
  { method: "GET", path: "/public/reviews/:token", auth: "public", module: false, handler: async (c) => { rateLimit(`rv:${clientIp(c.req)}`, 60, 10 * 60_000); return svc.publicView(c.params.token); } },
  { method: "POST", path: "/public/reviews/:token", auth: "public", module: false, handler: async (c) => { rateLimit(`rva:${clientIp(c.req)}`, 20, 10 * 60_000); return svc.answer(c.params.token, parse(answerBody, await c.body())); } },

  // Feedback (including private complaints) is for the owner.
  { method: "GET", path: "/reviews", auth: OWNER_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/reviews/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "GET", path: "/reviews/config", auth: OWNER_UP, handler: async (c) => svc.getConfig(tid(c.tenantId)) },
  { method: "PUT", path: "/reviews/config", auth: OWNER_UP, handler: async (c) => svc.putConfig(tid(c.tenantId), parse(configBody, await c.body()).threshold) },
  { method: "POST", path: "/reviews/:id/reply", auth: OWNER_UP, handler: async (c) => svc.reply(tid(c.tenantId), c.params.id, parse(replyBody, await c.body()).text) },
  { method: "POST", path: "/reviews/:id/resolve", auth: OWNER_UP, handler: async (c) => svc.resolve(tid(c.tenantId), c.params.id, true) },
  { method: "POST", path: "/reviews/:id/reopen", auth: OWNER_UP, handler: async (c) => svc.resolve(tid(c.tenantId), c.params.id, false) },
];
