import { NOW_MIN } from "./mock";
import { fa } from "./fa";
import { dayInfo } from "./dates";
import type { DB, StaffMember } from "./db";

export const DAY_LEN = 600; // ۹:۰۰ تا ۱۹:۰۰
export const STEP = 30;
export const clock = (m: number) => `${fa(String(9 + Math.floor(m / 60)).padStart(2, "0"))}:${fa(String(m % 60).padStart(2, "0"))}`;
export const svcOf = (db: DB, id: string) => db.services.find((s) => s.id === id);
export const eligibleStaff = (db: DB, serviceId: string) => { const sv = svcOf(db, serviceId); return sv ? db.staff.filter((s) => s.active && sv.staff.includes(s.id)) : []; };

/** پنجره‌ی کاری متخصص در یک روز = اشتراک ساعت سالن و ساعت متخصص؛ null یعنی نمی‌آید */
export function workWindow(db: DB, m: StaffMember, day: number): [number, number] | null {
  const idx = dayInfo(day).idx;
  const h = db.salon.hours[idx];
  if (!m.active || !h?.open || m.daysOff.includes(idx)) return null;
  if (m.leaves.some((l) => day >= l.from && day <= l.to)) return null;
  const s = Math.max(h.start, m.start), e = Math.min(h.end, m.end);
  return e > s ? [s, e] : null;
}
export const staffWorks = (db: DB, staffId: string, day: number) => { const m = db.staff.find((x) => x.id === staffId); return !!m && !!workWindow(db, m, day); };

/** دلیل غیرفعال بودن روز (برای نمایش) */
export function offReason(db: DB, m: StaffMember, day: number): string {
  const idx = dayInfo(day).idx;
  if (!db.salon.hours[idx]?.open) return "سالن تعطیل است";
  if (m.leaves.some((l) => day >= l.from && day <= l.to)) return `مرخصی: ${m.leaves.find((l) => day >= l.from && day <= l.to)!.reason || "مرخصی"}`;
  if (m.daysOff.includes(idx)) return "روز تعطیل متخصص";
  return "در دسترس نیست";
}

/** ساعت‌های شروع خالی برای یک متخصص (بدون تداخل با نوبت، استراحت و خارج از ساعت کاری) */
export function freeStarts(db: DB, staffId: string, day: number, dur: number, extra: DB["appts"] = []): number[] {
  const m = db.staff.find((x) => x.id === staffId);
  const win = m && workWindow(db, m, day);
  if (!m || !win) return [];
  const busy = [
    ...[...db.appts, ...extra].filter((a) => a.staffId === staffId && a.day === day).map((a) => [a.start, a.start + a.dur]),
    ...m.breaks.map((b) => [b.s, b.e]),
  ];
  const out: number[] = [];
  for (let s = win[0]; s + dur <= win[1]; s += STEP) {
    if (day === 0 && s < NOW_MIN) continue;
    if (busy.every(([bs, be]) => s + dur <= bs || s >= be)) out.push(s);
  }
  return out;
}
