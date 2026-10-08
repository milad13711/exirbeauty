// Pure customer-club rules (no DB): tiers, points earned on an invoice, cashback, next goal.

export type Tier = { name: string; from: number; off: number; perks: string };
export type EarnRules = { visit: number; svc: { pts: number; per: number }; prod: { pts: number; per: number } };
export type Reward = { id: string; name: string; cost: number; kind: "wallet" | "free" | "product"; value: number };
export type Cashback = { on: boolean; pct: number; minSpend: number; maxPerSale: number };
export type Config = { tiers: Tier[]; earn: EarnRules; rewards: Reward[]; cashback: Cashback };

export const DEFAULT_CONFIG: Config = {
  tiers: [
    { name: "برنزی", from: 0, off: 0, perks: "امتیاز پایه" },
    { name: "نقره‌ای", from: 500, off: 5, perks: "۵٪ تخفیف خدمات" },
    { name: "طلایی", from: 1200, off: 8, perks: "۸٪ تخفیف + اولویت رزرو" },
    { name: "VIP", from: 2000, off: 10, perks: "۱۰٪ تخفیف + هدیه تولد + اولویت" },
  ],
  earn: { visit: 50, svc: { pts: 10, per: 100_000 }, prod: { pts: 15, per: 100_000 } },
  rewards: [
    { id: "w1", name: "اعتبار ۵۰ هزار تومانی", cost: 500, kind: "wallet", value: 50_000 },
    { id: "w2", name: "اعتبار ۲۰۰ هزار تومانی", cost: 1800, kind: "wallet", value: 200_000 },
    { id: "w3", name: "ژل ناخن رایگان", cost: 1200, kind: "free", value: 850_000 },
  ],
  cashback: { on: true, pct: 3, minSpend: 500_000, maxPerSale: 300_000 },
};

const byFrom = (t: Tier[]) => [...t].sort((a, b) => a.from - b.from);

/** The highest tier whose threshold the (lifetime) points reach. */
export const tierFor = (tiers: Tier[], pts: number): Tier => [...byFrom(tiers)].reverse().find((t) => pts >= t.from) ?? byFrom(tiers)[0];

/** A tier never drops: spending points or a config change can't demote a customer below what they reached. */
export function settleTier(tiers: Tier[], lifetime: number, current: string): string {
  const earned = tierFor(tiers, lifetime).name;
  const rank = (n: string) => byFrom(tiers).findIndex((t) => t.name === n);
  return rank(earned) >= rank(current) ? earned : current;
}

export const tierOff = (tiers: Tier[], name: string) => tiers.find((t) => t.name === name)?.off ?? 0;

/** What's closest: the next tier or the cheapest reward still out of reach. */
export function nextGoal(c: Pick<Config, "tiers" | "rewards">, lifetime: number, points: number) {
  const nt = byFrom(c.tiers).find((t) => t.from > lifetime);
  const rw = [...c.rewards].sort((a, b) => a.cost - b.cost).find((r) => r.cost > points);
  const goals = [nt ? { left: nt.from - lifetime, label: `سطح ${nt.name}` } : null, rw ? { left: rw.cost - points, label: rw.name } : null].filter(Boolean) as { left: number; label: string }[];
  return goals.sort((a, b) => a.left - b.left)[0] ?? { left: 0, label: "بالاترین سطح" };
}

type L = { kind: "SERVICE" | "PRODUCT" | "OTHER" | "GIFT"; qty: number; price: number };

/** Points for an invoice: a visit bonus (if it has paid services) + points per spent amount, on values after the invoice discount. */
export function earnFor(rules: EarnRules, lines: L[], discountPct: number): number {
  const f = 1 - discountPct / 100;
  const sum = (kinds: L["kind"][]) => lines.filter((l) => kinds.includes(l.kind)).reduce((a, l) => a + l.price * l.qty, 0) * f;
  const svc = sum(["SERVICE", "OTHER"]), prod = sum(["PRODUCT"]);
  return (svc > 0 ? rules.visit : 0) + Math.floor(svc / rules.svc.per) * rules.svc.pts + Math.floor(prod / rules.prod.per) * rules.prod.pts;
}

/** Wallet credit back on an invoice: pct of what was actually paid (not from wallet), capped. */
export function cashbackFor(c: Cashback, paidExcludingWallet: number): number {
  if (!c.on || paidExcludingWallet < c.minSpend) return 0;
  return Math.min(c.maxPerSale, Math.floor((paidExcludingWallet * c.pct) / 100));
}
