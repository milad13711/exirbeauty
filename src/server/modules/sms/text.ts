// Pure SMS text helpers (no DB): segment counting, template rendering, defaults.

/** Persian (Unicode) SMS: the first segment holds 70 characters, each further one 67. */
export const parts = (t: string) => { const n = [...t].length; return n <= 70 ? 1 : Math.ceil(n / 67); };

export const render = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export const KINDS = ["MANUAL", "CONFIRM", "MOVED", "CANCEL", "REMINDER_24", "REMINDER_2", "THANKS", "BIRTHDAY", "CAMPAIGN", "REVIEW"] as const;
export type Kind = (typeof KINDS)[number];
/** Scenarios a salon can switch on/off and edit (MANUAL and CAMPAIGN are one-off sends). */
export type ScenarioKind = Exclude<Kind, "MANUAL" | "CAMPAIGN">;
export const SCENARIO_KINDS = KINDS.filter((k) => k !== "MANUAL" && k !== "CAMPAIGN") as ScenarioKind[];

export const SCENARIO_DEFAULTS: Record<ScenarioKind, { enabled: boolean; title: string; template: string; vars: string[] }> = {
  CONFIRM: { enabled: true, title: "تأیید نوبت", vars: ["name", "salon", "service", "date", "time"], template: "{name} عزیز، نوبت {service} شما در {salon} برای {date} ساعت {time} تأیید شد." },
  MOVED: { enabled: true, title: "جابه‌جایی نوبت", vars: ["name", "salon", "service", "date", "time"], template: "{name} عزیز، نوبت {service} شما در {salon} به {date} ساعت {time} منتقل شد." },
  CANCEL: { enabled: true, title: "لغو نوبت", vars: ["name", "salon", "service", "date", "time"], template: "{name} عزیز، نوبت {service} شما در {salon} برای {date} ساعت {time} لغو شد." },
  REMINDER_24: { enabled: true, title: "یادآوری ۲۴ ساعته", vars: ["name", "salon", "service", "date", "time"], template: "{name} عزیز، یادآوری نوبت {service} در {salon}: {date} ساعت {time}." },
  REMINDER_2: { enabled: false, title: "یادآوری ۲ ساعته", vars: ["name", "salon", "service", "time"], template: "{name} عزیز، نوبت {service} شما در {salon} ساعت {time} است." },
  THANKS: { enabled: false, title: "تشکر بعد از خدمت", vars: ["name", "salon", "service"], template: "{name} عزیز، از اینکه {salon} را برای {service} انتخاب کردید سپاسگزاریم." },
  REVIEW: { enabled: false, title: "درخواست نظر بعد از خدمت", vars: ["name", "salon", "service", "link"], template: "{name} عزیز، نظرتان درباره‌ی {service} در {salon} برایمان مهم است: {link}" },
  BIRTHDAY: { enabled: false, title: "تبریک تولد", vars: ["name", "salon"], template: "{name} عزیز، تولدت مبارک! {salon} برایت روزی پر از شادی آرزو می‌کند." },
};

export const MAX_TEXT = 500;

const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
export const timeFa = (min: number) => fa(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
/** "YYYY-MM-DD" (Gregorian) → Jalali for humans, e.g. "۱۵ مهر". */
export const dateFa = (ymd: string) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${ymd}T00:00:00Z`));

/** Iranian mobile in any common spelling → 09XXXXXXXXX, or null. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[^\d+]/g, "").replace(/^(\+98|0098|98)/, "0");
  const m = /^0?(9\d{9})$/.exec(d);
  return m ? `0${m[1]}` : null;
}

/** Credit a package gives: price plus its bonus percentage (whole toman). */
export const packageCredit = (price: number, bonusPct: number) => Math.round(price * (1 + bonusPct / 100));
