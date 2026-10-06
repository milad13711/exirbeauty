// Pure scheduling logic (no DB, no clock): everything the calendar decides about time lives here so it is unit-testable.
// Times are the salon's local calendar: dates as "YYYY-MM-DD", times as minutes from midnight, weekdays 0 = Saturday … 6 = Friday.

export type DayHours = { open: boolean; start: number; end: number };
export type Interval = { s: number; e: number };
export type StaffSchedule = { startMin: number; endMin: number; daysOff: number[]; breaks: Interval[] };

export const DEFAULT_HOURS: DayHours[] = [...Array.from({ length: 6 }, () => ({ open: true, start: 540, end: 1140 })), { open: false, start: 540, end: 1140 }];

/** Iranian week: Saturday = 0 … Friday = 6. */
export function weekdayOf(date: string): number {
  const js = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return (js + 1) % 7;
}

export function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export const addDays = (date: string, n: number) => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export type Now = { date: string; minute: number };

/** Current date/minute in the salon's timezone (Iran has no DST; this keeps working if that ever changes). */
export function tehranNow(at: Date = new Date()): Now {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** UTC instant for a local salon date + minute (Asia/Tehran = UTC+03:30). */
export function instantOf(date: string, minute: number): Date {
  const hh = String(Math.floor(minute / 60)).padStart(2, "0"), mm = String(minute % 60).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00+03:30`);
}

/** The bookable window for one staff member on one day, or null when they don't work then. */
export function workWindow(i: { weekday: number; salonHours: DayHours[]; staff: StaffSchedule; onLeave: boolean }): Interval | null {
  const day = i.salonHours[i.weekday];
  if (!day?.open || i.staff.daysOff.includes(i.weekday) || i.onLeave) return null;
  const s = Math.max(day.start, i.staff.startMin), e = Math.min(day.end, i.staff.endMin);
  return s < e ? { s, e } : null;
}

const overlaps = (a: Interval, b: Interval) => a.s < b.e && b.s < a.e;

/** Does [start, start+duration) sit inside the window and avoid every break and existing appointment? */
export function fits(window: Interval | null, breaks: Interval[], busy: Interval[], start: number, durationMin: number): boolean {
  if (!window) return false;
  const slot = { s: start, e: start + durationMin };
  if (slot.s < window.s || slot.e > window.e) return false;
  return ![...breaks, ...busy].some((x) => overlaps(slot, x));
}

/** Start times on the slot grid that fit, no earlier than `earliest`. */
export function freeStarts(i: { window: Interval | null; breaks: Interval[]; busy: Interval[]; durationMin: number; stepMin: number; earliest?: number }): number[] {
  if (!i.window) return [];
  const out: number[] = [];
  const first = Math.max(i.window.s, i.earliest ?? 0);
  for (let t = Math.ceil(first / i.stepMin) * i.stepMin; t + i.durationMin <= i.window.e; t += i.stepMin) {
    if (fits(i.window, i.breaks, i.busy, t, i.durationMin)) out.push(t);
  }
  return out;
}

/** Earliest allowed start minute on `date`, given "now" and a minimum notice. Infinity = the whole day is in the past. */
export function earliestFor(date: string, now: Now, leadMin: number): number {
  if (date < now.date) return Infinity;
  if (date === now.date) return now.minute + leadMin;
  // Notice longer than the time left today also pushes into following days.
  const spill = now.minute + leadMin - 1440;
  return date === addDays(now.date, 1) && spill > 0 ? spill : 0;
}

// ───────── status machine ─────────

export type Status = "PENDING" | "CONFIRMED" | "IN_SERVICE" | "DONE" | "CANCELED" | "NO_SHOW";
const NEXT: Record<Status, Status[]> = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["IN_SERVICE", "DONE", "CANCELED", "NO_SHOW"],
  IN_SERVICE: ["DONE", "CANCELED"],
  DONE: [], CANCELED: [], NO_SHOW: [],
};
export const canTransition = (from: Status, to: Status) => NEXT[from].includes(to);
/** Only appointments that still occupy a time slot can be moved. */
export const isMovable = (s: Status) => s === "PENDING" || s === "CONFIRMED";
/** Statuses that hold the staff member's time (kept in sync with the database exclusion constraint). */
export const ACTIVE: Status[] = ["PENDING", "CONFIRMED", "IN_SERVICE"];
