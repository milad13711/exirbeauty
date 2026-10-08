// Pure money rules for the cashier (whole toman, no DB): invoice totals, debt allocation, daily report.

export type Line = { kind: "SERVICE" | "PRODUCT" | "OTHER" | "GIFT"; qty: number; price: number; staffId?: string | null; commissionPct?: number };

export function totals(lines: Pick<Line, "qty" | "price">[], discountPct: number) {
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const discount = Math.round((subtotal * discountPct) / 100);
  return { subtotal, discount, total: subtotal - discount };
}

/** A line's value after the invoice-level discount, rounded per line. */
export const netOf = (l: Pick<Line, "qty" | "price">, discountPct: number) => Math.round(l.price * l.qty * (1 - discountPct / 100));

export type Owed = { id: string; debt: number; date: string; number: number };

/** Pays the oldest debts first. Returns the per-invoice amounts and whatever could not be placed. */
export function allocateDebt(owed: Owed[], amount: number) {
  let left = amount;
  const out: { id: string; take: number; remaining: number }[] = [];
  for (const s of [...owed].sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number)) {
    if (left <= 0) break;
    if (s.debt <= 0) continue;
    const take = Math.min(s.debt, left);
    left -= take;
    out.push({ id: s.id, take, remaining: s.debt - take });
  }
  return { allocations: out, unplaced: left };
}

export type SaleRow = { total: number; paid: number; discountPct: number; discount: number; lines: Line[]; payments: { method: "CASH" | "CARD" | "ONLINE" | "WALLET" | "GIFT"; amount: number }[] };
export type ExpenseRow = { amount: number; method: "CASH" | "CARD" | "ONLINE" | "WALLET" | "GIFT" };
export type DebtPayRow = { amount: number; method: "CASH" | "CARD" | "ONLINE" | "WALLET" | "GIFT" };

/** Totals for non-void invoices plus expenses and debt collections over a period. */
export function summarize(sales: SaleRow[], expenses: ExpenseRow[], debtPays: DebtPayRow[]) {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const gross = (kinds: Line["kind"][]) => sum(sales.flatMap((s) => s.lines.filter((l) => kinds.includes(l.kind)).map((l) => l.price * l.qty)));
  const byMethod = (m: "CASH" | "CARD" | "ONLINE" | "WALLET" | "GIFT") => sum(sales.flatMap((s) => s.payments.filter((p) => p.method === m).map((p) => p.amount)));
  const debtBy = (m: "CASH" | "CARD" | "ONLINE" | "WALLET" | "GIFT") => sum(debtPays.filter((p) => p.method === m).map((p) => p.amount));
  const expBy = (m: "CASH" | "CARD" | "ONLINE" | "WALLET" | "GIFT") => sum(expenses.filter((e) => e.method === m).map((e) => e.amount));
  // Selling a gift card takes money in but earns nothing yet (it is a liability); the revenue is booked when the card is spent.
  const giftSold = gross(["GIFT"]);
  const revenue = sum(sales.map((s) => s.total)) - giftSold;
  const totalExpenses = sum(expenses.map((e) => e.amount));
  return {
    count: sales.length, revenue, services: gross(["SERVICE"]), products: gross(["PRODUCT", "OTHER"]), discounts: sum(sales.map((s) => s.discount)),
    cash: byMethod("CASH"), card: byMethod("CARD"), online: byMethod("ONLINE"), wallet: byMethod("WALLET"), giftSpent: byMethod("GIFT"), giftSold,
    newDebt: sum(sales.map((s) => s.total - s.paid)), debtCollected: sum(debtPays.map((p) => p.amount)),
    expenses: totalExpenses, net: revenue - totalExpenses,
    cashExpected: byMethod("CASH") + debtBy("CASH") - expBy("CASH"),
  };
}

/** Per-staff service revenue (after discount) and commission. */
export function commissions(sales: Pick<SaleRow, "discountPct" | "lines">[]) {
  const by = new Map<string, { revenue: number; commission: number }>();
  for (const s of sales) for (const l of s.lines) {
    if (l.kind !== "SERVICE" || !l.staffId) continue;
    const net = netOf(l, s.discountPct);
    const cur = by.get(l.staffId) ?? { revenue: 0, commission: 0 };
    cur.revenue += net;
    cur.commission += Math.round((net * (l.commissionPct ?? 0)) / 100);
    by.set(l.staffId, cur);
  }
  return [...by.entries()].map(([staffId, v]) => ({ staffId, ...v }));
}
