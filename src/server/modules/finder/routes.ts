import type { Route } from "../../http/types";
import { rateLimit } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { createListing, leadBody, listingBody, listQuery, rejectBody, reviewBody } from "./schemas";
import * as svc from "./service";

const MIN = 60_000;
const editCode = (req: Request) => req.headers.get("x-edit-code");

export const finderRoutes: Route[] = [
  // ── public directory
  { method: "GET", path: "/finder/listings", handler: async (c) => svc.listPublished(parse(listQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/finder/listings/:id", handler: async (c) => svc.getPublished(c.params.id) },
  {
    method: "POST", path: "/finder/listings",
    handler: async (c) => {
      rateLimit(`finder:create:${c.ip}`, 5, 60 * MIN);
      return svc.createListing(parse(createListing, await c.body()));
    },
  },
  {
    method: "POST", path: "/finder/listings/:id/reviews",
    handler: async (c) => {
      rateLimit(`finder:review:${c.ip}`, 5, 10 * MIN);
      return svc.addReview(c.params.id, parse(reviewBody, await c.body()));
    },
  },
  {
    method: "POST", path: "/finder/listings/:id/leads",
    handler: async (c) => {
      rateLimit(`finder:lead:${c.ip}`, 5, 60 * MIN);
      return svc.addLead(c.params.id, parse(leadBody, await c.body()));
    },
  },

  // ── owner (identified by listing id + x-edit-code header)
  {
    method: "GET", path: "/finder/listings/:id/manage",
    handler: async (c) => {
      rateLimit(`finder:manage:${c.ip}:${c.params.id}`, 10, 10 * MIN);
      return svc.getForOwner(c.params.id, editCode(c.req));
    },
  },
  {
    method: "PUT", path: "/finder/listings/:id",
    handler: async (c) => {
      rateLimit(`finder:edit:${c.ip}:${c.params.id}`, 10, 10 * MIN);
      return svc.submitEdit(c.params.id, editCode(c.req), parse(listingBody, await c.body()));
    },
  },

  // ── admin moderation
  {
    method: "GET", path: "/admin/finder/listings", auth: { roles: ["ADMIN", "SUPER_ADMIN"] },
    handler: async (c) => svc.adminList({ status: c.query.get("status") ?? undefined, pendingEdits: c.query.get("pendingEdits") === "1" }),
  },
  {
    method: "POST", path: "/admin/finder/listings/:id/approve", auth: { roles: ["ADMIN", "SUPER_ADMIN"] },
    handler: async (c) => {
      const r = await svc.approve(c.params.id);
      await audit(c.session, "finder.approve", "FinderListing", c.params.id, r);
      return r;
    },
  },
  {
    method: "POST", path: "/admin/finder/listings/:id/reject", auth: { roles: ["ADMIN", "SUPER_ADMIN"] },
    handler: async (c) => {
      const { reason } = parse(rejectBody, await c.body());
      const r = await svc.reject(c.params.id, reason);
      await audit(c.session, "finder.reject", "FinderListing", c.params.id, { ...r, reason });
      return r;
    },
  },
  {
    method: "POST", path: "/admin/finder/listings/:id/unpublish", auth: { roles: ["ADMIN", "SUPER_ADMIN"] },
    handler: async (c) => {
      const { reason } = parse(rejectBody, await c.body());
      await svc.unpublish(c.params.id, reason);
      await audit(c.session, "finder.unpublish", "FinderListing", c.params.id, { reason });
      return { ok: true };
    },
  },
  {
    method: "DELETE", path: "/admin/finder/reviews/:id", auth: { roles: ["ADMIN", "SUPER_ADMIN"] },
    handler: async (c) => {
      await svc.deleteReview(c.params.id);
      await audit(c.session, "finder.review.delete", "FinderReview", c.params.id);
      return { ok: true };
    },
  },
];
