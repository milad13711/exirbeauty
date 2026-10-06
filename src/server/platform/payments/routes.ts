import { z } from "zod";
import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { rateLimit } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import { handleCallback, listForTenant, publicStatus, startPayment } from "./service";

const MANAGER = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const months = z.number().int().min(1).max(12).default(1);

const payBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("plan"), planCode: z.string().min(1).max(40), months }),
  z.object({ kind: z.literal("addon"), moduleId: z.string().min(1).max(40), months }),
]);

export const paymentRoutes: Route[] = [
  {
    method: "POST", path: "/tenant/payments", auth: MANAGER,
    handler: async (c) => {
      if (!c.tenantId) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)");
      rateLimit(`pay:${c.session!.userId}`, 10, 10 * 60_000);
      return startPayment(c.tenantId, c.session!.userId, parse(payBody, await c.body()));
    },
  },
  {
    method: "GET", path: "/tenant/payments", auth: MANAGER,
    handler: async (c) => {
      if (!c.tenantId) throw badRequest("سالن مشخص نیست");
      return listForTenant(c.tenantId);
    },
  },
  // Gateway redirect: public (the browser comes back from the bank), identified only by the one-time authority.
  {
    method: "GET", path: "/payments/zarinpal/callback",
    handler: async (c) => {
      const authority = c.query.get("Authority") ?? "";
      const r = await handleCallback(authority.slice(0, 64), c.query.get("Status") ?? "");
      const base = process.env.APP_URL ?? "http://localhost:3000";
      return Response.redirect(`${base}/payment/result?${new URLSearchParams({ ...(r.paymentId ? { id: r.paymentId } : {}), r: r.result })}`, 303);
    },
  },
  { method: "GET", path: "/payments/:id/status", handler: async (c) => publicStatus(c.params.id) },
];
