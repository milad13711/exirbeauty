import { z } from "zod";
import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { rateLimit } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const; // answers include money and customer data
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const aiRoutes: Route[] = [
  { method: "GET", path: "/ai/suggestions", auth: OWNER_UP, handler: async () => svc.suggestions() },
  { method: "POST", path: "/ai/ask", auth: OWNER_UP, handler: async (c) => {
      rateLimit(`ai:${tid(c.tenantId)}`, 60, 10 * 60_000);
      return svc.ask(tid(c.tenantId), parse(z.object({ question: z.string().trim().min(2, "سؤال را بنویسید").max(300) }), await c.body()).question);
    } },
];
