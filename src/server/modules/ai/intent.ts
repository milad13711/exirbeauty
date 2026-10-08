// Pure question understanding for the rule-based salon assistant (no DB, no language model).
export type Intent = "sales_drop" | "capacity" | "outreach" | "margin" | "revenue" | "staff" | "debt" | "stock" | "help";

const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌‏]/g, " ").replace(/\s+/g, " ").trim();
const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));

/** The first matching rule wins, so the more specific questions come first. */
export function intentOf(raw: string): { intent: Intent; day: 0 | 1 } {
  const q = norm(raw);
  const day = has(q, "فردا") ? 1 : 0;
  if (has(q, "چرا", "کاهش", "کم شده", "افت") && has(q, "فروش", "درآمد")) return { intent: "sales_drop", day };
  if (has(q, "ظرفیت", "وقت خالی", "نوبت خالی", "خالی")) return { intent: "capacity", day };
  if (has(q, "پیام بدهم", "پیام بفرستم", "به چه مشتری", "پیگیری", "تماس بگیرم", "برگردان")) return { intent: "outreach", day };
  if (has(q, "سودآور", "حاشیه سود", "کدام خدمت")) return { intent: "margin", day };
  if (has(q, "بدهی", "بدهکار")) return { intent: "debt", day };
  if (has(q, "موجودی", "انبار", "تمام شده", "سفارش بدهم")) return { intent: "stock", day };
  if (has(q, "متخصص", "پرسنل", "بهترین", "پرفروش")) return { intent: "staff", day };
  if (has(q, "فروش", "درآمد", "سود")) return { intent: "revenue", day };
  return { intent: "help", day };
}

export const SUGGESTIONS = ["چرا فروش این هفته کم شده؟", "فردا ظرفیت خالی دارم؟", "به چه مشتری‌هایی پیام بدهم؟", "کدام خدمت سودآورتر است؟", "بدهی مشتریان چقدر است؟", "کدام کالاها رو به اتمام‌اند؟", "بهترین متخصص ما کیست؟", "فروش امروز چقدر بوده؟"];

export const pctChange = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);
