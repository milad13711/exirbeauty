import { timingSafeEqual } from "node:crypto";
import type { Route } from "../../http/types";
import { badRequest, forbidden } from "../../http/errors";
import { clientIp, rateLimit } from "../../http/ratelimit";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { expireWalletPayments, startPlanWithWallet, startStoreOrderPayment } from "../../platform/payments/service";
import { adminOrdersQuery, catalogQuery, orderBody, productBody, productPatch, recommendQuery, statusBody, trackBody, walletPlanBody } from "./schemas";
import * as svc from "./service";

const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const ADMIN = { roles: ["ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };

function cronAuth(req: Request) {
  const want = process.env.CRON_SECRET, got = req.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(got), b = Buffer.from(want ?? "");
  if (!want || a.length !== b.length || !timingSafeEqual(a, b)) throw forbidden("دسترسی ندارید");
}

export const shopRoutes: Route[] = [
  // The public storefront: no login, throttled; salons are credited through `ref` (their slug).
  { method: "GET", path: "/public/store/products", auth: "public", module: false, handler: async (c) => svc.catalog(parse(catalogQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/public/store/products/:id", auth: "public", module: false, handler: async (c) => svc.product(c.params.id) },
  { method: "POST", path: "/public/store/track", auth: "public", module: false, handler: async (c) => { rateLimit(`track:${clientIp(c.req)}`, 20, 10 * 60_000); const b = parse(trackBody, await c.body()); return svc.track(b.number, b.phone); } },
  { method: "GET", path: "/public/store/ref/:slug", auth: "public", module: false, handler: async (c) => svc.referrer(c.params.slug) },
  { method: "POST", path: "/public/store/orders", auth: "public", module: false, handler: async (c) => {
      rateLimit(`store:${clientIp(c.req)}`, 10, 10 * 60_000);
      const order = await svc.createOrder(parse(orderBody, await c.body()));
      try { return { orderId: order.id, number: order.number, total: order.total, ...(await startStoreOrderPayment(order)) }; }
      catch (e) { await svc.releaseOrder(order.id); throw e; } // the gateway was unreachable: give the stock back
    } },

  // Salons: their commission dashboard, wallet, recommendations.
  { method: "GET", path: "/shop/overview", auth: OWNER_UP, handler: async (c) => svc.overview(tid(c.tenantId)) },
  { method: "GET", path: "/shop/wallet", auth: OWNER_UP, handler: async (c) => svc.wallet(tid(c.tenantId)) },
  { method: "POST", path: "/shop/wallet/pay-plan", auth: OWNER_UP, handler: async (c) => {
      const b = parse(walletPlanBody, await c.body());
      // partial: use whatever the wallet holds and pay the rest online (the wallet part is refunded if that payment fails)
      const r = b.partial ? await startPlanWithWallet(tid(c.tenantId), c.session!.userId, b.planCode, b.months) : { ...(await svc.payPlanFromWallet(tid(c.tenantId), b.planCode, b.months)), paid: true as const };
      await audit(c.session, "shop.wallet.plan", "Tenant", c.tenantId!, b);
      return r;
    } },
  { method: "GET", path: "/shop/recommend", auth: STAFF_UP, handler: async (c) => svc.recommend(tid(c.tenantId), parse(recommendQuery, Object.fromEntries(c.query)).customerId) },
  { method: "GET", path: "/shop/products", auth: STAFF_UP, handler: async () => svc.catalog({}) },

  // Platform team: catalog and fulfilment.
  { method: "GET", path: "/admin/store/products", auth: ADMIN, module: false, handler: async () => svc.adminProducts() },
  { method: "POST", path: "/admin/store/products", auth: ADMIN, module: false, handler: async (c) => { const r = await svc.adminCreateProduct(parse(productBody, await c.body())); await audit(c.session, "store.product.create", "StoreProduct", r.id); return r; } },
  { method: "PATCH", path: "/admin/store/products/:id", auth: ADMIN, module: false, handler: async (c) => { const r = await svc.adminUpdateProduct(c.params.id, parse(productPatch, await c.body())); await audit(c.session, "store.product.update", "StoreProduct", r.id); return r; } },
  { method: "GET", path: "/admin/store/orders", auth: ADMIN, module: false, handler: async (c) => svc.adminOrders(parse(adminOrdersQuery, Object.fromEntries(c.query)).status) },
  { method: "POST", path: "/admin/store/orders/:id/status", auth: ADMIN, module: false, handler: async (c) => { const b = parse(statusBody, await c.body()); await svc.setStatus(c.params.id, b.status, b.trackingCode); await audit(c.session, "store.order.status", "StoreOrder", c.params.id, b); return { ok: true }; } },

  // Scheduler: release commissions past the return window, free stock held by abandoned checkouts.
  { method: "POST", path: "/shop/cron/run", auth: "public", module: false, handler: async (c) => { cronAuth(c.req); return { credited: await svc.releaseCommissions(), expired: await svc.expireStale(), refunded: await expireWalletPayments() }; } },
];
