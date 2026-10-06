import { timingSafeEqual } from "node:crypto";
import type { Route } from "../../http/types";
import { badRequest, forbidden } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { startSmsTopup } from "../../platform/payments/service";
import { adjustBody, listQuery, packageBody, packagePatch, pricingBody, scenarioBody, sendBody, statsQuery, thresholdBody, topupBody } from "./schemas";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const ADMIN = { roles: ["ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

/** Cron callers authenticate with a shared secret (header x-cron-secret); without CRON_SECRET configured the endpoint is closed. */
function cronAuth(req: Request) {
  const want = process.env.CRON_SECRET, got = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(got), b = Buffer.from(want ?? "");
  if (!want || a.length !== b.length || !timingSafeEqual(a, b)) throw forbidden("دسترسی ندارید");
}

export const smsRoutes: Route[] = [
  { method: "GET", path: "/sms/account", auth: STAFF_UP, handler: async (c) => svc.account(tid(c.tenantId)) },
  { method: "PATCH", path: "/sms/account", auth: OWNER_UP, handler: async (c) => svc.setThreshold(tid(c.tenantId), parse(thresholdBody, await c.body()).lowThreshold) },
  { method: "GET", path: "/sms/packages", auth: STAFF_UP, handler: async () => svc.listPackages() },
  { method: "POST", path: "/sms/topup", auth: OWNER_UP, handler: async (c) => startSmsTopup(tid(c.tenantId), c.session!.userId, parse(topupBody, await c.body()).packageId) },

  { method: "POST", path: "/sms/send", auth: STAFF_UP, handler: async (c) => svc.sendManual(tid(c.tenantId), parse(sendBody, await c.body())) },
  { method: "GET", path: "/sms/messages", auth: STAFF_UP, handler: async (c) => { const q = parse(listQuery, Object.fromEntries(c.query)); return svc.messages(tid(c.tenantId), q); } },
  { method: "GET", path: "/sms/transactions", auth: OWNER_UP, handler: async (c) => svc.transactions(tid(c.tenantId), 100) },
  { method: "GET", path: "/sms/stats", auth: OWNER_UP, handler: async (c) => svc.stats(tid(c.tenantId), parse(statsQuery, Object.fromEntries(c.query)).days) },

  { method: "GET", path: "/sms/scenarios", auth: STAFF_UP, handler: async (c) => svc.scenarios(tid(c.tenantId)) },
  { method: "PUT", path: "/sms/scenarios/:kind", auth: OWNER_UP, handler: async (c) => svc.putScenario(tid(c.tenantId), c.params.kind.toUpperCase(), parse(scenarioBody, await c.body())) },

  // Called by a scheduler (e.g. every 10 minutes); idempotent. Public + secret, so it opts out of the tenant guard.
  { method: "POST", path: "/sms/cron/run", auth: "public", module: false, handler: async (c) => { cronAuth(c.req); return svc.runDue(); } },

  // Platform admin: pricing, packages, manual credit adjustments.
  { method: "GET", path: "/admin/sms/pricing", auth: ADMIN, module: false, handler: async () => ({ pricing: await svc.getPricing(), packages: await svc.listPackages(true) }) },
  { method: "PUT", path: "/admin/sms/pricing", auth: ADMIN, module: false, handler: async (c) => { const r = await svc.setPricing(parse(pricingBody, await c.body())); await audit(c.session, "sms.pricing", "PlatformSetting", "sms.pricing", r); return r; } },
  { method: "POST", path: "/admin/sms/packages", auth: ADMIN, module: false, handler: async (c) => svc.createPackage(parse(packageBody, await c.body())) },
  { method: "PATCH", path: "/admin/sms/packages/:id", auth: ADMIN, module: false, handler: async (c) => svc.updatePackage(c.params.id, parse(packagePatch, await c.body())) },
  { method: "POST", path: "/admin/sms/adjust", auth: ADMIN, module: false, handler: async (c) => {
      const b = parse(adjustBody, await c.body());
      const r = await svc.adjust(b.tenantId, b.delta, b.note);
      await audit(c.session, "sms.adjust", "SmsAccount", b.tenantId, { tenantId: b.tenantId, delta: b.delta, note: b.note });
      return r;
    } },
];
