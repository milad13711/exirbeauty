// Pure audience rules for campaigns (no DB): who matches a segment.

export type Segment = { inactiveDays?: number; tiers?: string[]; birthdayMonth?: boolean; minSpend?: number; service?: string };

export type Facts = {
  /** Whole days since the last recorded visit; null = never visited */
  daysSinceVisit: number | null;
  totalSpent: number;
  tier: string | null;
  services: ReadonlySet<string>;
  /** Jalali month (1-12) of the birth date; null = unknown */
  birthMonth: number | null;
};

export const hasFilter = (s: Segment) => s.inactiveDays !== undefined || !!s.tiers?.length || !!s.birthdayMonth || s.minSpend !== undefined || !!s.service;

export function matches(f: Facts, s: Segment, ctx: { month: number }): boolean {
  if (s.inactiveDays !== undefined && (f.daysSinceVisit === null || f.daysSinceVisit < s.inactiveDays)) return false;
  if (s.tiers?.length && !(f.tier && s.tiers.includes(f.tier))) return false;
  if (s.birthdayMonth && f.birthMonth !== ctx.month) return false;
  if (s.minSpend !== undefined && f.totalSpent < s.minSpend) return false;
  if (s.service && !f.services.has(s.service)) return false;
  return true;
}

/** Jalali month (1-12) of a Gregorian date, in UTC terms (birth dates are stored as plain dates). */
export const jalaliMonth = (d: Date) => Number(new Intl.DateTimeFormat("en-u-ca-persian", { month: "numeric", timeZone: "UTC" }).format(d));

/** Messages can use {name} (first name only). */
export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";
