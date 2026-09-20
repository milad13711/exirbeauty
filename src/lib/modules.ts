import type { DB } from "./db";

export type ModuleDef = { id: string; name: string; desc: string; cat: string; routes: string[]; req?: string[]; defaultPrice: number };

/** هسته‌ی محصول همیشه فعال است: نوبت‌دهی، خدمات، متخصص، پروفایل مشتری (+ داشبورد، تنظیمات، پشتیبانی) */
export const CORE_PREFIXES = ["/", "/calendar", "/customers", "/services", "/staff", "/settings", "/support", "/notifications", "/modules"];
export const CORE_NAMES = ["نوبت‌دهی و تقویم", "تعریف خدمات", "مدیریت متخصص‌ها", "پروفایل و پرونده‌ی زیبایی مشتری"];

export const MODULES: ModuleDef[] = [
  { id: "cashier", name: "صندوق و درآمد", desc: "فاکتور، پرداخت ترکیبی، هزینه، بدهی و بستن روز", cat: "عملیات", routes: ["/cashier"], defaultPrice: 390_000 },
  { id: "inventory", name: "انبار و تأمین", desc: "موجودی، نقطه سفارش و ورود کالا", cat: "عملیات", routes: ["/procurement"], defaultPrice: 290_000 },
  { id: "reports", name: "گزارش‌ها و خروجی Excel", desc: "گزارش فروش، خدمات، متخصص و مشتری", cat: "عملیات", routes: ["/reports"], defaultPrice: 250_000 },
  { id: "sms", name: "پیامک و سناریوهای خودکار", desc: "خط اختصاصی، اعتبار لحظه‌ای و ارسال خودکار با کنترل کامل", cat: "ارتباط با مشتری", routes: ["/sms", "/automation"], defaultPrice: 0 },
  { id: "campaigns", name: "کمپین و بازاریابی", desc: "ساخت کمپین با شرط‌های ترکیبی مخاطب", cat: "ارتباط با مشتری", routes: ["/campaigns"], req: ["sms"], defaultPrice: 290_000 },
  { id: "reviews", name: "نظرسنجی و اعتبار", desc: "نظرسنجی خودکار بعد از خدمت و مدیریت شکایت", cat: "ارتباط با مشتری", routes: ["/reviews"], defaultPrice: 190_000 },
  { id: "loyalty", name: "باشگاه مشتریان", desc: "سطح، امتیاز و جایزه", cat: "وفاداری", routes: ["/loyalty", "/wallet"], defaultPrice: 350_000 },
  { id: "referral", name: "معرفی دوستان", desc: "لینک اختصاصی و پاداش معرفی", cat: "وفاداری", routes: ["/referral"], defaultPrice: 250_000 },
  { id: "memberships", name: "پکیج و عضویت", desc: "درآمد تکرارشونده با پلن ماهانه", cat: "درآمد جدید", routes: ["/memberships"], defaultPrice: 250_000 },
  { id: "giftcards", name: "کارت هدیه", desc: "صدور و خرج کارت هدیه", cat: "درآمد جدید", routes: ["/gift-cards"], defaultPrice: 190_000 },
  { id: "shop", name: "فروشگاه و پورسانت", desc: "فروشگاه اکسیر، لینک معرفی و توصیه‌ی محصول", cat: "درآمد جدید", routes: ["/shop", "/referral-store", "/recommend"], defaultPrice: 350_000 },
  { id: "portal", name: "پنل و اپ مشتری", desc: "ورود مشتری، نوبت‌ها، امتیاز و کیف پول", cat: "مشتری", routes: ["/me", "/client-app"], defaultPrice: 450_000 },
  { id: "content", name: "تولید محتوا", desc: "کپشن و کارت استوری از عکس‌های قبل/بعد", cat: "رشد", routes: ["/content"], defaultPrice: 290_000 },
  { id: "marketplace", name: "مارکت‌پلیس متخصص‌ها", desc: "پروفایل عمومی و جذب مشتری جدید", cat: "رشد", routes: ["/marketplace"], defaultPrice: 390_000 },
  { id: "ai", name: "مدیر هوشمند سالن", desc: "پرسش و پاسخ روی داده‌های سالن", cat: "رشد", routes: ["/ai"], defaultPrice: 690_000 },
  { id: "academy", name: "آکادمی", desc: "دوره‌های آموزشی مدیر و متخصص", cat: "رشد", routes: ["/academy"], defaultPrice: 250_000 },
  { id: "network", name: "شبکه خدمات جانبی", desc: "بیمه، تجهیزات، استخدام و …", cat: "رشد", routes: ["/network"], defaultPrice: 190_000 },
];
export const moduleById = (id: string) => MODULES.find((m) => m.id === id);

export const defaultPlanModules: Record<string, string[]> = (() => {
  const basic = ["cashier", "sms", "reviews"];
  const pro = [...basic, "inventory", "reports", "loyalty", "referral", "campaigns", "memberships", "giftcards", "shop", "portal"];
  const elite = [...pro, "content", "marketplace", "ai", "academy", "network"];
  return { basic, pro, elite };
})();

export const planLabel: Record<string, string> = { basic: "پایه", pro: "حرفه‌ای", elite: "سازمانی" };

/** آیا ماژول در پلن (یا خرید تکی) در دسترس است؟ */
export const moduleAvailable = (d: DB, id: string) => (d.planModules[d.sub.planId] ?? []).includes(id) || d.modules.addons.includes(id);
/** فعال = در دسترس + نصب‌شده + پیش‌نیازها فعال */
export function moduleActive(d: DB, id: string): boolean {
  const m = moduleById(id);
  if (!m) return true;
  return moduleAvailable(d, id) && d.modules.installed.includes(id) && (m.req ?? []).every((r) => moduleActive(d, r));
}
export const modulePrice = (d: DB, id: string) => d.modulePrices[id] ?? moduleById(id)?.defaultPrice ?? 0;
/** ارزان‌ترین پلنی که ماژول را دارد */
export const minPlanFor = (d: DB, id: string) => (["basic", "pro", "elite"] as const).find((p) => (d.planModules[p] ?? []).includes(id));

/** کدام ماژول صاحب این مسیر است؟ (null = هسته یا خارج از ماژول) */
export function moduleForPath(path: string): ModuleDef | null {
  return MODULES.find((m) => m.routes.some((r) => path === r || path.startsWith(r + "/"))) ?? null;
}

/** با تغییر پلن، ماژول‌های تازه‌در‌دسترس خودکار نصب و ماژول‌های ازدست‌رفته از نصب‌ها حذف می‌شوند */
export function modulesAfterPlanChange(d: DB, newPlan: string): DB["modules"] {
  const prev = new Set(d.planModules[d.sub.planId] ?? []);
  const next = d.planModules[newPlan] ?? [];
  const avail = new Set([...next, ...d.modules.addons]);
  const fresh = next.filter((x) => !prev.has(x));
  return { addons: d.modules.addons.filter((a) => !next.includes(a)), installed: [...new Set([...d.modules.installed.filter((x) => avail.has(x)), ...fresh])] };
}
