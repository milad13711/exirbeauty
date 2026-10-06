import type { Route } from "../../http/types";
import { badRequest } from "../../http/errors";
import { parse } from "../../http/validate";
import { audit } from "../../platform/audit";
import { tehranNow } from "../calendar/availability";
import { closeBody, dateStr, debtPayBody, expenseBody, rangeQuery, saleBody, salesQuery, voidBody } from "./schemas";
import * as svc from "./service";

// Cashiers (staff) can issue invoices and see them; money totals, voids, expenses and closing are owner-level.
const STAFF_UP = { roles: ["OWNER", "STAFF", "ADMIN", "SUPER_ADMIN"] } as const;
const OWNER_UP = { roles: ["OWNER", "ADMIN", "SUPER_ADMIN"] } as const;
const tid = (t: string | null) => { if (!t) throw badRequest("سالن مشخص نیست (ادمین باید هدر x-tenant-id بفرستد)"); return t; };
const dayParam = (v: string) => parse(dateStr, v);

export const cashierRoutes: Route[] = [
  { method: "POST", path: "/cashier/sales", auth: STAFF_UP, handler: async (c) => svc.createSale(tid(c.tenantId), c.session!, parse(saleBody, await c.body())) },
  { method: "GET", path: "/cashier/sales", auth: STAFF_UP, handler: async (c) => svc.listSales(tid(c.tenantId), parse(salesQuery, Object.fromEntries(c.query))) },
  { method: "GET", path: "/cashier/sales/:id", auth: STAFF_UP, handler: async (c) => svc.getSale(tid(c.tenantId), c.params.id) },
  { method: "POST", path: "/cashier/sales/:id/void", auth: OWNER_UP, handler: async (c) => {
      const r = await svc.voidSale(tid(c.tenantId), c.params.id, parse(voidBody, await c.body()).reason);
      await audit(c.session, "cashier.void", "Sale", c.params.id, { tenantId: c.tenantId, reason: r.voidReason });
      return r;
    } },

  { method: "GET", path: "/cashier/expenses", auth: OWNER_UP, handler: async (c) => { const q = parse(rangeQuery, Object.fromEntries(c.query)); return svc.listExpenses(tid(c.tenantId), q.from, q.to ?? q.from); } },
  { method: "POST", path: "/cashier/expenses", auth: OWNER_UP, handler: async (c) => svc.addExpense(tid(c.tenantId), parse(expenseBody, await c.body())) },
  { method: "DELETE", path: "/cashier/expenses/:id", auth: OWNER_UP, handler: async (c) => { await svc.deleteExpense(tid(c.tenantId), c.params.id); return { ok: true }; } },

  { method: "GET", path: "/cashier/debts", auth: STAFF_UP, handler: async (c) => svc.listDebts(tid(c.tenantId)) },
  { method: "POST", path: "/cashier/debts/pay", auth: STAFF_UP, handler: async (c) => {
      const b = parse(debtPayBody, await c.body());
      const r = await svc.payDebt(tid(c.tenantId), c.session!, { customerId: b.customerId, amount: b.amount, method: b.method as "CASH" | "CARD" | "ONLINE" });
      await audit(c.session, "cashier.debt.pay", "Customer", b.customerId, { tenantId: c.tenantId, amount: b.amount });
      return r;
    } },

  { method: "GET", path: "/cashier/summary", auth: OWNER_UP, handler: async (c) => { const q = parse(rangeQuery, Object.fromEntries(c.query)); return svc.summary(tid(c.tenantId), q.from, q.to ?? q.from); } },
  { method: "GET", path: "/cashier/days/today", auth: OWNER_UP, handler: async (c) => svc.dayStatus(tid(c.tenantId), tehranNow().date) },
  { method: "GET", path: "/cashier/days/:date", auth: OWNER_UP, handler: async (c) => svc.dayStatus(tid(c.tenantId), dayParam(c.params.date)) },
  { method: "POST", path: "/cashier/days/:date/close", auth: OWNER_UP, handler: async (c) => {
      const date = dayParam(c.params.date);
      const b = parse(closeBody, await c.body());
      const r = await svc.closeDay(tid(c.tenantId), c.session!, date, b.countedCash, b.note);
      await audit(c.session, "cashier.day.close", "Tenant", c.tenantId!, { date, difference: r.closing?.difference });
      return r;
    } },
  { method: "DELETE", path: "/cashier/days/:date/close", auth: OWNER_UP, handler: async (c) => {
      const date = dayParam(c.params.date);
      const r = await svc.reopenDay(tid(c.tenantId), date);
      await audit(c.session, "cashier.day.reopen", "Tenant", c.tenantId!, { date });
      return r;
    } },
];
