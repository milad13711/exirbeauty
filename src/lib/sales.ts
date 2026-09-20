import { commit, getDB, TODAY_SHORT, type Customer, type DB } from "./db";
import type { DebtPayment, Expense, PayMethod, Sale, SaleLine, StockItem } from "./seed-extra";
import { uid } from "./factories";
import { tierFor, tierOff, nextGoal, withPoints, earnFor } from "./loyalty";
import { ops } from "./ops";
import { moduleActive } from "./modules";

export { tierFor, tierOff, nextGoal, withPoints, earnFor };
export type Tier = Customer["tier"];

export type SaleInput = { customerId: string | null; customerName: string; lines: SaleLine[]; discountPct: number; pays: Sale["pays"]; apptId?: string; note?: string };

export const sales = {
  isClosed: (d: DB, day: number) => d.closings.some((c) => c.day === day),

  createSale(i: SaleInput): { id: string; earned: number } {
    const d = getDB();
    const subtotal = i.lines.reduce((a, l) => a + l.price * l.qty, 0);
    const discount = Math.round((subtotal * i.discountPct) / 100);
    const total = subtotal - discount;
    const paid = i.pays.reduce((a, p) => a + p.amount, 0);
    const debt = Math.max(0, total - paid);
    const walletUsed = i.pays.filter((p) => p.method === "کیف پول").reduce((a, p) => a + p.amount, 0);
    const cust = i.customerId ? d.customers.find((c) => c.id === i.customerId) : undefined;
    const earned = cust && moduleActive(d, "loyalty") ? earnFor(d.loyalty, i.lines, i.discountPct) : 0;
    const id = `F-${d.saleSeq}`;
    const sale: Sale = { id, day: 0, time: "۱۴:۲۰", customerId: i.customerId, customerName: i.customerName, lines: i.lines, subtotal, discountPct: i.discountPct, discount, total, pays: i.pays.filter((p) => p.amount > 0), debt, status: debt > 0 ? "بدهکار" : "پرداخت‌شده", earned, walletUsed, apptId: i.apptId, note: i.note };

    const svcLines = i.lines.filter((l) => l.kind === "service");
    let customers = d.customers;
    if (cust) {
      const first = cust.visits === 0 && svcLines.length > 0;
      customers = customers.map((c) => {
        if (c.id !== cust.id) return c;
        const n: Customer = { ...c, total: c.total + total, visits: c.visits + (svcLines.length ? 1 : 0), lastVisit: TODAY_SHORT, lastVisitDays: 0, risk: "ok", debt: c.debt + debt, wallet: c.wallet - walletUsed, walletLog: walletUsed ? [{ d: TODAY_SHORT, delta: -walletUsed, note: `پرداخت فاکتور ${id}` }, ...c.walletLog] : c.walletLog, products: [...new Set([...c.products, ...i.lines.filter((l) => l.kind === "product").map((l) => l.name)])] };
        n.avg = n.visits ? Math.round(n.total / n.visits) : 0;
        n.log = [...svcLines.map((l) => ({ id: uid("l"), d: TODAY_SHORT, s: l.name, by: d.staff.find((x) => x.id === l.staffId)?.name ?? "—", cat: d.services.find((x) => x.id === l.refId)?.cat ?? "مو", price: Math.round(l.price * l.qty * (1 - i.discountPct / 100)), photos: false })), ...n.log];
        return earned ? withPoints(d, n, earned, `فاکتور ${id}`) : n;
      });
      // پاداش معرفی: اولین خرید مشتریِ معرفی‌شده
      if (first && cust.referredBy && d.referral.enabled && moduleActive(d, "referral")) {
        customers = customers.map((c) => (c.id === cust.referredBy ? { ...withPoints(d, c, d.referral.referrerPts, `معرفی ${cust.name}`), referrals: c.referrals + 1 } : c));
      }
    }

    // موجودی محصولات، کارت هدیه، آمار متخصص، نوبت
    const inv = d.inv.map((x) => { const q = i.lines.filter((l) => l.kind === "product" && l.refId === x.id).reduce((a, l) => a + l.qty, 0); return q ? { ...x, stock: Math.max(0, x.stock - q) } : x; });
    const giftCards = d.giftCards.map((g) => { const used = i.pays.filter((p) => p.method === "کارت هدیه" && p.ref === g.code).reduce((a, p) => a + p.amount, 0); if (!used) return g; const bal = g.balance - used; return { ...g, balance: bal, status: bal <= 0 ? ("استفاده‌شده" as const) : g.status }; });
    const staff = d.staff.map((m) => { const mine = svcLines.filter((l) => l.staffId === m.id); if (!mine.length) return m; const rev = mine.reduce((a, l) => a + l.price * l.qty * (1 - i.discountPct / 100), 0); const com = mine.reduce((a, l) => a + l.price * l.qty * (1 - i.discountPct / 100) * ((l.commissionPct ?? m.commissionPct) / 100), 0); return { ...m, revenue: m.revenue + Math.round(rev), commission: m.commission + Math.round(com) }; });
    commit({ ...d, sales: [...d.sales, sale], saleSeq: d.saleSeq + 1, customers, inv, giftCards, staff, appts: i.apptId ? d.appts.map((a) => (a.id === i.apptId ? { ...a, status: "done" } : a)) : d.appts });
    ops.requestSurvey(id, i.customerId, i.customerName, i.lines.filter((l) => l.kind === "service"));
    return { id, earned };
  },

  voidSale(id: string, reason: string) {
    const d = getDB();
    const s = d.sales.find((x) => x.id === id);
    if (!s || s.status === "باطل" || sales.isClosed(d, s.day)) return;
    const svcLines = s.lines.filter((l) => l.kind === "service");
    commit({
      ...d,
      sales: d.sales.map((x) => (x.id === id ? { ...x, status: "باطل", voidReason: reason } : x)),
      customers: d.customers.map((c) => {
        if (c.id !== s.customerId) return c;
        const n: Customer = { ...c, total: Math.max(0, c.total - s.total), visits: Math.max(0, c.visits - (svcLines.length ? 1 : 0)), debt: Math.max(0, c.debt - s.debt), wallet: c.wallet + s.walletUsed, walletLog: s.walletUsed ? [{ d: TODAY_SHORT, delta: s.walletUsed, note: `ابطال فاکتور ${id}` }, ...c.walletLog] : c.walletLog };
        n.avg = n.visits ? Math.round(n.total / n.visits) : 0;
        return s.earned ? withPoints(d, n, -s.earned, `ابطال فاکتور ${id}`) : n;
      }),
      inv: d.inv.map((x) => { const q = s.lines.filter((l) => l.kind === "product" && l.refId === x.id).reduce((a, l) => a + l.qty, 0); return q ? { ...x, stock: x.stock + q } : x; }),
      giftCards: d.giftCards.map((g) => { const back = s.pays.filter((p) => p.method === "کارت هدیه" && p.ref === g.code).reduce((a, p) => a + p.amount, 0); return back ? { ...g, balance: g.balance + back, status: "فعال" as const } : g; }),
      staff: d.staff.map((m) => { const mine = svcLines.filter((l) => l.staffId === m.id); if (!mine.length) return m; const f = 1 - s.discountPct / 100; return { ...m, revenue: Math.max(0, m.revenue - Math.round(mine.reduce((a, l) => a + l.price * l.qty * f, 0))), commission: Math.max(0, m.commission - Math.round(mine.reduce((a, l) => a + l.price * l.qty * f * ((l.commissionPct ?? m.commissionPct) / 100), 0))) }; }),
    });
  },

  addExpense(e: Omit<Expense, "id" | "day">) { const d = getDB(); commit({ ...d, expenses: [...d.expenses, { ...e, id: uid("e"), day: 0 }] }); },
  deleteExpense(id: string) { const d = getDB(); commit({ ...d, expenses: d.expenses.filter((x) => x.id !== id) }); },

  /** دریافت بدهی: قدیمی‌ترین بدهی‌ها اول تسویه می‌شوند */
  payDebt(customerId: string, amount: number, method: DebtPayment["method"]) {
    const d = getDB();
    let left = amount;
    const sl = [...d.sales].sort((a, b) => a.day - b.day).map((s) => {
      if (s.customerId !== customerId || s.debt <= 0 || left <= 0) return s;
      const take = Math.min(s.debt, left); left -= take;
      const debt = s.debt - take;
      return { ...s, debt, status: debt <= 0 ? ("پرداخت‌شده" as const) : s.status };
    });
    const map = new Map(sl.map((s) => [s.id, s]));
    commit({
      ...d, sales: d.sales.map((s) => map.get(s.id) ?? s),
      customers: d.customers.map((c) => (c.id === customerId ? { ...c, debt: Math.max(0, c.debt - amount) } : c)),
      debtPays: [...d.debtPays, { id: uid("dp"), day: 0, customerId, amount, method }],
    });
  },

  closeDay(day: number, countedCash: number, note: string) {
    const d = getDB();
    const expectedCash = daySummary(d, day).cashExpected;
    commit({ ...d, closings: [...d.closings.filter((c) => c.day !== day), { day, expectedCash, countedCash, note }] });
  },
  reopenDay(day: number) { const d = getDB(); commit({ ...d, closings: d.closings.filter((c) => c.day !== day) }); },

  receiveStock(id: string, qty: number, cost: number) { const d = getDB(); commit({ ...d, inv: d.inv.map((x) => (x.id === id ? { ...x, stock: x.stock + qty, cost: cost || x.cost } : x)) }); },
  saveStockItem(it: StockItem) { const d = getDB(); commit({ ...d, inv: d.inv.some((x) => x.id === it.id) ? d.inv.map((x) => (x.id === it.id ? it : x)) : [...d.inv, it] }); },
  deleteStockItem(id: string) { const d = getDB(); commit({ ...d, inv: d.inv.filter((x) => x.id !== id) }); },
};

/** خلاصه‌ی یک روز (یا یک بازه با day از..تا) */
export function summarize(d: DB, from: number, to: number = from) {
  const inR = (n: number) => n >= from && n <= to;
  const ss = d.sales.filter((s) => inR(s.day) && s.status !== "باطل");
  const sum = (f: (s: Sale) => number) => ss.reduce((a, s) => a + f(s), 0);
  const gross = (k: SaleLine["kind"]) => sum((s) => s.lines.filter((l) => l.kind === k).reduce((a, l) => a + l.price * l.qty, 0));
  const method = (m: PayMethod) => sum((s) => s.pays.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0));
  const exps = d.expenses.filter((e) => inR(e.day));
  const dps = d.debtPays.filter((p) => inR(p.day));
  const commission = sum((s) => s.lines.filter((l) => l.kind === "service").reduce((a, l) => a + l.price * l.qty * (1 - s.discountPct / 100) * ((l.commissionPct ?? 0) / 100), 0));
  const paidNow = sum((s) => s.pays.reduce((a, p) => a + p.amount, 0));
  const expenses = exps.reduce((a, e) => a + e.amount, 0);
  const cashExpected = method("نقدی") + dps.filter((p) => p.method === "نقدی").reduce((a, p) => a + p.amount, 0) - exps.filter((e) => e.method === "نقدی").reduce((a, e) => a + e.amount, 0);
  return {
    sales: ss, count: ss.length, revenue: sum((s) => s.total), services: gross("service") + gross("membership"), products: gross("product"), discounts: sum((s) => s.discount),
    cash: method("نقدی"), card: method("کارت"), online: method("آنلاین"), wallet: method("کیف پول"), gift: method("کارت هدیه"),
    newDebt: sum((s) => s.total - s.pays.reduce((a, p) => a + p.amount, 0)), debtCollected: dps.reduce((a, p) => a + p.amount, 0),
    expenses, commission: Math.round(commission), cashExpected, paidNow, net: sum((s) => s.total) - expenses,
  };
}
export const daySummary = (d: DB, day: number) => summarize(d, day, day);
