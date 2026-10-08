// Pure membership rules (no DB). Dates are salon-local "YYYY-MM-DD" strings; a month is 30 days.
import { addDays } from "../calendar/availability";

export const MONTH_DAYS = 30;

/**
 * A new membership starts today; renewing one that is still valid continues from its expiry so no paid time is lost.
 */
export function termFor(today: string, months: number, currentExpiry?: string | null) {
  const from = currentExpiry && currentExpiry >= today ? currentExpiry : today;
  return { start: today, expiry: addDays(from, months * MONTH_DAYS) };
}

export type Status = "ACTIVE" | "EXPIRED" | "CANCELED";
/** Validity is a function of the date, so nothing has to "run" at midnight. */
export const effectiveStatus = (m: { status: "ACTIVE" | "CANCELED"; expiryDate: string }, today: string): Status =>
  m.status === "CANCELED" ? "CANCELED" : m.expiryDate < today ? "EXPIRED" : "ACTIVE";

/** Monthly recurring revenue across valid memberships (price spread over its months). */
export const mrr = (plans: { price: number; months: number }[]) => Math.round(plans.reduce((a, p) => a + p.price / Math.max(1, p.months), 0));
