// تاریخ شمسی نمونه؛ «امروز» = شنبه ۲۸ شهریور ۱۴۰۵ (۲۰۲۶-۰۹-۱۹)
const BASE = Date.UTC(2026, 8, 19, 12);
export function dayInfo(off: number) {
  const d = new Date(BASE + off * 864e5);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", ...o }).format(d);
  return {
    weekday: f({ weekday: "long" }),
    short: f({ day: "numeric", month: "long" }),
    full: `${f({ weekday: "long" })} ${f({ day: "numeric", month: "long", year: "numeric" })}`,
    idx: ((off % 7) + 7) % 7, // ۰ = شنبه … ۶ = جمعه
  };
}
