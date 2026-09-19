import { blocked, NOW_MIN, staff } from "./mock";
import { catalog } from "./mock2";
import { fa } from "./fa";
import type { DBAppt } from "./db";

export const DAY_LEN = 600; // ۹:۰۰ تا ۱۹:۰۰
export const STEP = 30;
export const clock = (m: number) => `${fa(String(9 + Math.floor(m / 60)).padStart(2, "0"))}:${fa(String(m % 60).padStart(2, "0"))}`;
export const svcOf = (id: string) => catalog.find((s) => s.id === id)!;

/** جمعه تعطیل است؛ سارا احمدی سه‌شنبه‌ها مرخصی است */
export function staffWorks(staffId: string, dayIdx: number) {
  if (dayIdx === 6) return false;
  if (staffId === "s4" && dayIdx === 3) return false;
  return true;
}

/** ساعت‌های شروع خالی برای یک متخصص در یک روز (بدون تداخل با نوبت، استراحت و مرخصی) */
export function freeStarts(staffId: string, day: number, dayIdx: number, dur: number, list: DBAppt[]): number[] {
  if (!staffWorks(staffId, dayIdx)) return [];
  const busy = [
    ...list.filter((a) => a.staffId === staffId && a.day === day).map((a) => [a.start, a.start + a.dur]),
    ...(blocked[staffId] ?? []).map((b) => [b.s, b.e]),
  ];
  const out: number[] = [];
  for (let s = 0; s + dur <= DAY_LEN; s += STEP) {
    if (day === 0 && s < NOW_MIN) continue;
    if (busy.every(([bs, be]) => s + dur <= bs || s >= be)) out.push(s);
  }
  return out;
}

export const eligibleStaff = (serviceId: string) => staff.filter((s) => svcOf(serviceId).staff.includes(s.id));
