import { TODAY_SHORT, type Customer, type DB, type Loyalty } from "./db";
import type { SaleLine } from "./seed-extra";

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
export function earnFor(l: Loyalty, lines: SaleLine[], pct: number): number {
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

