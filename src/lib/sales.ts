import { commit, getDB, TODAY_SHORT, type Customer, type DB, type Loyalty } from "./db";
import type { DebtPayment, Expense, PayMethod, Sale, SaleLine, StockItem } from "./seed-extra";
import { uid } from "./factories";

export type Tier = Customer["tier"];
export const tierFor = (l: Loyalty, pts: number): Tier => [...l.tiers].sort((a, b) => b.from - a.from).find((t) => pts >= t.from)?.name ?? "برنزی";
export const tierOff = (l: Loyalty, t: Tier) => l.tiers.find((x) => x.name === t)?.off ?? 0;
/** امتیاز باقی‌مانده تا هدف بعدی (سطح بعدی یا ارزان‌ترین جایزه‌ی قابل‌دسترس) */
export function nextGoal(l: Loyalty, pts: number) {
  const nt = [...l.tiers].sort((a, b) => a.from - b.from).find((t) => t.from > pts);
  const rw = [...l.rewards].sort((a, b) => a.cost - b.cost).find((r) => r.cost > pts);
  const goals = [nt ? { left: nt.from - pts, label: `سطح ${nt.name}` } : null, rw ? { left: rw.cost - pts, label: rw.name } : null].filter(Boolean) as { left: number; label: string }[];
  return goals.sort((a, b) => a.left - b.left)[0] ?? { left: 0, label: "بالاترین سطح" };
}

const rule = (l: Loyalty, id: string) => l.earn.find((e) => e.id === id);
function earnFor(l: Loyalty, lines: SaleLine[], pct: number): number {
  const f = 1 - pct / 100;
  const svc = lines.filter((x) => x.kind !== "product").reduce((a, x) => a + x.price * x.qty, 0) * f;
  const prod = lines.filter((x) => x.kind === "product").reduce((a, x) => a + x.price * x.qty, 0) * f;
  const rs = rule(l, "svc"), rp = rule(l, "prod"), rv = rule(l, "visit");
  return (svc > 0 ? (rv?.pts ?? 0) : 0) + (rs ? Math.floor(svc / (rs.per ?? 100_000)) * rs.pts : 0) + (rp ? Math.floor(prod / (rp.per ?? 100_000)) * rp.pts : 0);
}

export function withPoints(d: DB, c: Customer, delta: number, note: string): Customer {
  const points = Math.max(0, c.points + delta);
  // سطح فقط بالا می‌رود؛ خرج کردن امتیاز باعث افت سطح نمی‌شود
  const rank = (t: Tier) => d.loyalty.tiers.findIndex((x) => x.name === t);
  const earned = tierFor(d.loyalty, points);
  const tier = rank(earned) > rank(c.tier) ? earned : c.tier;
  return { ...c, points, tier, nextRewardIn: nextGoal(d.loyalty, points).left, ptsLog: [{ d: TODAY_SHORT, delta, note }, ...c.ptsLog].slice(0, 60) };
}

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
    const earned = cust ? earnFor(d.loyalty, i.lines, i.discountPct) : 0;
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
      if (first && cust.referredBy && d.referral.enabled) {
        customers = customers.map((c) => (c.id === cust.referredBy ? { ...withPoints(d, c, d.referral.referrerPts, `معرفی ${cust.name}`), referrals: c.referrals + 1 } : c));
      }
    }

    // موجودی محصولات، کارت هدیه، آمار متخصص، نوبت
    const inv = d.inv.map((x) => { const q = i.lines.filter((l) => l.kind === "product" && l.refId === x.id).reduce((a, l) => a + l.qty, 0); return q ? { ...x, stock: Math.max(0, x.stock - q) } : x; });
    const giftCards = d.giftCards.map((g) => { const used = i.pays.filter((p) => p.method === "کارت هدیه" && p.ref === g.code).reduce((a, p) => a + p.amount, 0); if (!used) return g; const bal = g.balance - used; return { ...g, balance: bal, status: bal <= 0 ? ("استفاده‌شده" as const) : g.status }; });
    const staff = d.staff.map((m) => { const mine = svcLines.filter((l) => l.staffId === m.id); if (!mine.length) return m; const rev = mine.reduce((a, l) => a + l.price * l.qty * (1 - i.discountPct / 100), 0); const com = mine.reduce((a, l) => a + l.price * l.qty * (1 - i.discountPct / 100) * ((l.commissionPct ?? m.commissionPct) / 100), 0); return { ...m, revenue: m.revenue + Math.round(rev), commission: m.commission + Math.round(com) }; });
    commit({ ...d, sales: [...d.sales, sale], saleSeq: d.saleSeq + 1, customers, inv, giftCards, staff, appts: i.apptId ? d.appts.map((a) => (a.id === i.apptId ? { ...a, status: "done" } : a)) : d.appts });
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
