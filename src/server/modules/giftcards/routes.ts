import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { issueBody, listQuery, lookupBody } from "./schemas";
import * as svc from "./service";

const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

export const giftcardRoutes: Route[] = [
  { method: "POST", path: "/giftcards", auth: STAFF_UP, handler: async (c) => {
      const r = await svc.issue(tid(c.tenantId), c.session!, parse(issueBody, await c.body()));
      await audit(c.session, "giftcard.issue", "GiftCard", r.id, { tenantId: c.tenantId, amount: r.amount });
      return r;
    } },
  // POST (not GET) so codes never end up in URLs, logs or browser history.
  { method: "POST", path: "/giftcards/lookup", auth: STAFF_UP, handler: async (c) => svc.lookup(tid(c.tenantId), parse(lookupBody, await c.body()).code) },
  { method: "GET", path: "/giftcards", auth: OWNER_UP, handler: async (c) => svc.list(tid(c.tenantId), parse(listQuery, Object.fromEntries(c.query)).status) },
  { method: "GET", path: "/giftcards/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "GET", path: "/giftcards/:id/history", auth: OWNER_UP, handler: async (c) => svc.history(tid(c.tenantId), c.params.id) },
];
