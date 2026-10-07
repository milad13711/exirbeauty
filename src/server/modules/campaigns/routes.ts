import { timingSafeEqual } from "node:crypto";
import type { Route } from "../../http/types";
import { badRequest, forbidden } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { createBody, previewBody } from "./schemas";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

function cronAuth(req: Request) {
  const want = process.env.CRON_SECRET, got = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(got), b = Buffer.from(want ?? "");
  if (!want || a.length !== b.length || !timingSafeEqual(a, b)) throw forbidden("دسترسی ندارید");
}

// Campaigns spend the salon's SMS credit on its customers, so they are owner-level.
export const campaignRoutes: Route[] = [
  { method: "GET", path: "/campaigns", auth: OWNER_UP, handler: async (c) => svc.list(tid(c.tenantId)) },
  { method: "POST", path: "/campaigns/preview", auth: OWNER_UP, handler: async (c) => { const b = parse(previewBody, await c.body()); return svc.preview(tid(c.tenantId), b.segment, b.message); } },
  { method: "POST", path: "/campaigns", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.create(tid(c.tenantId), parse(createBody, await c.body()));
      await audit(c.session, "campaign.create", "Campaign", r.id, { tenantId: c.tenantId, audience: r.audienceCount });
      return r;
    } },
  { method: "DELETE", path: "/campaigns/:id", auth: OWNER_UP, handler: async (c) => { await svc.cancel(tid(c.tenantId), c.params.id); return { ok: true }; } },
  // Scheduler hook (same shared secret as the SMS cron); idempotent.
  { method: "POST", path: "/campaigns/cron/run", auth: "public", module: false, handler: async (c) => { cronAuth(c.req); return svc.runScheduled(); } },
];
