// The partner-service categories a salon can ask about (fixed list; the platform team handles each request by hand).
export const CATEGORIES = [
  { id: "بیمه", description: "بیمه‌ی مسئولیت سالن و بیمه‌ی تکمیلی پرسنل" },
  { id: "خدمات مالی", description: "وام کسب‌وکار، دستگاه کارتخوان و حسابداری" },
  { id: "تجهیزات", description: "خرید و تعمیر صندلی، دستگاه و ابزار سالن" },
  { id: "اجاره صندلی", description: "اجاره‌ی صندلی یا فضا به متخصص‌های مستقل" },
  { id: "استخدام متخصص", description: "پیدا کردن آرایشگر، ناخن‌کار و پوست‌کار" },
  { id: "تأمین مواد", description: "رنگ، اکسیدان و مصرفی با قیمت عمده" },
  { id: "تبلیغات", description: "تبلیغات محلی و اینفلوئنسر" },
  { id: "عکاسی", description: "عکس نمونه‌کار و محتوای شبکه‌های اجتماعی" },
  { id: "طراحی", description: "لوگو، منو، تابلو و دکوراسیون" },
  { id: "مشاوره کسب‌وکار", description: "مشاوره‌ی مالی، قیمت‌گذاری و رشد" },
] as const;

export const isCategory = (c: string) => CATEGORIES.some((x) => x.id === c);

export type Status = "SUBMITTED" | "REVIEWING" | "ANSWERED";
/** Requests only move forward: submitted → reviewing → answered. */
const ORDER: Status[] = ["SUBMITTED", "REVIEWING", "ANSWERED"];
export const canAdvance = (from: Status, to: Status) => ORDER.indexOf(to) > ORDER.indexOf(from);
