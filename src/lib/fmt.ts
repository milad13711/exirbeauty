// Date/time helpers for the live (API-backed) screens. Dates are salon-local "YYYY-MM-DD"; times are minutes from midnight.

export const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

export function todayLocal(at: Date = new Date()): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export const addDays = (date: string, n: number) => new Date(new Date(`${date}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
/** Saturday = 0 … Friday = 6 */
export const weekdayOf = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 1) % 7;

const f = (date: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", ...o }).format(new Date(`${date}T00:00:00Z`));
export const faDate = {
  weekday: (d: string) => f(d, { weekday: "long" }),
  short: (d: string) => f(d, { day: "numeric", month: "long" }),
  full: (d: string) => `${f(d, { weekday: "long" })} ${f(d, { day: "numeric", month: "long", year: "numeric" })}`,
};

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
export const faNum = fa;
/** 615 → "۱۰:۱۵" */
export const fmtMin = (m: number) => fa(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
/** "10:15" → 615, or null when malformed */
export const parseTime = (s: string): number | null => { const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim()); if (!m) return null; const v = +m[1] * 60 + +m[2]; return +m[1] < 24 && +m[2] < 60 ? v : null; };
export const timeValue = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const toman = (n: number) => `${fa(n.toLocaleString("en-US"))} تومان`;
export const shortToman = (n: number) => (n >= 1_000_000 ? `${fa((n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0).replace(".", "٫"))} میلیون` : n >= 1000 ? `${fa(Math.round(n / 1000))} هزار` : fa(n));
