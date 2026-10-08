// Pure client-portal rules (no DB).
import { instantOf } from "../calendar/availability";

/** Customers may cancel their own appointment only while enough notice remains (the salon's "free cancellation" window). */
export function canCancel(a: { status: string; date: string; startMin: number }, cancelHours: number, now: Date = new Date()): boolean {
  if (a.status !== "PENDING" && a.status !== "CONFIRMED") return false;
  return instantOf(a.date, a.startMin).getTime() - now.getTime() >= cancelHours * 3_600_000;
}

/** The OTP is bound to one salon and one phone, so a code for one salon is useless at another. */
export const otpKey = (tenantId: string, phone: string) => `c:${tenantId}:${phone}`;
