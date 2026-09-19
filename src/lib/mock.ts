// داده نمونه برای پروتوتایپ UI. «امروز» = شنبه ۲۸ شهریور ۱۴۰۵
export const TODAY = "شنبه ۲۸ شهریور ۱۴۰۵";

export type Tier = "برنزی" | "نقره‌ای" | "طلایی" | "VIP";
export type Category = "مو" | "پوست" | "ناخن" | "آرایش";

export const catColor: Record<Category, { bg: string; fg: string; bar: string }> = {
  مو: { bg: "bg-rosesoft", fg: "text-rosedeep", bar: "#b4536f" },
  پوست: { bg: "bg-sagesoft", fg: "text-sage", bar: "#4f8a73" },
  ناخن: { bg: "bg-goldsoft", fg: "text-gold", bar: "#b8924a" },
  آرایش: { bg: "bg-skysoft", fg: "text-sky", bar: "#4a7fb0" },
};

export const staff = [
  { id: "s1", name: "مریم حسینی", role: "متخصص رنگ و مش", color: "#b4536f", rating: 4.9, revenue: 86_400_000, clients: 74, returning: 88, commission: 25_900_000, avgInvoice: 1_960_000, fill: 92, products: 7_800_000 },
  { id: "s2", name: "نازنین کریمی", role: "متخصص کراتین و کوتاهی", color: "#b8924a", rating: 4.8, revenue: 72_100_000, clients: 66, returning: 81, commission: 21_600_000, avgInvoice: 1_640_000, fill: 85, products: 5_200_000 },
  { id: "s3", name: "الهام رضایی", role: "متخصص پوست", color: "#4f8a73", rating: 4.9, revenue: 61_500_000, clients: 52, returning: 90, commission: 18_400_000, avgInvoice: 2_100_000, fill: 78, products: 11_400_000 },
  { id: "s4", name: "سارا احمدی", role: "ناخن", color: "#4a7fb0", rating: 4.6, revenue: 38_900_000, clients: 61, returning: 72, commission: 11_700_000, avgInvoice: 780_000, fill: 64, products: 1_900_000 },
];

export const services = [
  { id: "v1", cat: "مو" as Category, name: "رنگ ریشه", price: 1_800_000, min: 120, margin: 62 },
  { id: "v2", cat: "مو" as Category, name: "بالیاژ", price: 4_500_000, min: 240, margin: 58 },
  { id: "v3", cat: "مو" as Category, name: "کراتین", price: 3_800_000, min: 180, margin: 71 },
  { id: "v4", cat: "مو" as Category, name: "کوتاهی", price: 650_000, min: 45, margin: 84 },
  { id: "v5", cat: "پوست" as Category, name: "فیشال هیدرا", price: 1_900_000, min: 75, margin: 68 },
  { id: "v6", cat: "پوست" as Category, name: "پاکسازی عمیق", price: 1_100_000, min: 60, margin: 74 },
  { id: "v7", cat: "ناخن" as Category, name: "ژل و لاک", price: 850_000, min: 90, margin: 66 },
  { id: "v8", cat: "ناخن" as Category, name: "مانیکور", price: 450_000, min: 45, margin: 79 },
];

export const profile = {
    id: "c1", name: "سارا محمدی", phone: "۰۹۱۲ ۳۴۵ ۶۷۸۹", gender: "زن", birth: "۱۵ آذر ۱۳۷۹", age: 25, tier: "VIP" as Tier,
    points: 2450, nextRewardIn: 550, visits: 34, total: 68_400_000, avg: 2_010_000, lastVisit: "۱۰ شهریور",
    lastVisitDays: 18, cycleDays: 42, nextDue: "۲ مهر", favService: "رنگ ریشه", favStaff: "مریم حسینی", staffId: "s1",
    occasions: ["تولد: ۱۵ آذر", "سالگرد ازدواج: ۲۲ اردیبهشت"], allergies: ["حساسیت به پارافنیلن‌دی‌آمین (PPD)", "پوست سر حساس"],
    note: "دوست ندارد سشوار داغ. همیشه قهوه بدون شکر. ترجیح می‌دهد ساعت عصر نوبت بگیرد.",
    tags: ["وفادار", "خریدار محصول", "معرف فعال"], referrals: 6, wallet: 150_000,
    hair: { current: "بلوند شکلاتی ۷.۳", type: "ضخیم، موج‌دار", state: "خشک در انتها، رنگ‌شده", brand: "Wella Koleston", oxidant: "۶٪ (۲۰ حجم)", lastColor: "۱۰ شهریور ۱۴۰۵", formula: "۳۰ گرم رنگ ۷.۳ + ۱۰ گرم رنگ ۷.۰ + ۴۰ میلی‌لیتر اکسیدان ۶٪", history: ["قهوه‌ای تیره ۴.۰ — فروردین ۱۴۰۵", "شاتوش ۶.۷ — دی ۱۴۰۴", "مشکی ۱.۰ — مهر ۱۴۰۴"] },
    skin: { type: "ترکیبی", used: "سرم ویتامین C، ضدآفتاب SPF50", allergies: "اسید گلیکولیک غلیظ", facials: ["هیدرا — مرداد ۱۴۰۵", "پاکسازی — تیر ۱۴۰۵"] },
    nail: { services: "ژل و لاک", colors: "نود، بژ، قرمز کلاسیک", allergies: "ندارد" },
    products: ["شامپو ترمیم‌کننده Olaplex N.4", "ماسک مو Kerastase", "سرم ویتامین C"],
    log: [
      { d: "۱۰ شهریور", s: "رنگ ریشه + براشینگ", by: "مریم حسینی", cat: "مو" as Category, price: 2_450_000, photos: true },
      { d: "۲۴ مرداد", s: "فیشال هیدرا", by: "الهام رضایی", cat: "پوست" as Category, price: 1_900_000, photos: true },
      { d: "۲۹ تیر", s: "ژل و لاک", by: "سارا احمدی", cat: "ناخن" as Category, price: 850_000, photos: false },
      { d: "۱۸ تیر", s: "رنگ ریشه", by: "مریم حسینی", cat: "مو" as Category, price: 1_800_000, photos: true },
    ],
    risk: "ok" as const,
};

export const customers = [
  profile,
  { id: "c2", name: "نیلوفر صادقی", phone: "۰۹۱۲ ۱۱۱ ۲۲۳۳", tier: "طلایی" as Tier, visits: 21, total: 41_200_000, lastVisit: "۲۰ مرداد", lastVisitDays: 39, cycleDays: 40, favService: "کراتین", risk: "hot" as const },
  { id: "c3", name: "پریسا نوری", phone: "۰۹۳۵ ۴۴۴ ۵۵۶۶", tier: "VIP" as Tier, visits: 47, total: 96_800_000, lastVisit: "۲۶ تیر", lastVisitDays: 64, cycleDays: 30, favService: "بالیاژ", risk: "lost" as const },
  { id: "c4", name: "مهسا کاظمی", phone: "۰۹۱۹ ۷۷۷ ۸۸۹۹", tier: "نقره‌ای" as Tier, visits: 9, total: 12_300_000, lastVisit: "۲۱ شهریور", lastVisitDays: 7, cycleDays: 35, favService: "فیشال هیدرا", risk: "ok" as const },
  { id: "c5", name: "الناز جعفری", phone: "۰۹۱۲ ۹۹۹ ۰۰۱۱", tier: "برنزی" as Tier, visits: 3, total: 3_700_000, lastVisit: "۱۲ مرداد", lastVisitDays: 47, cycleDays: 45, favService: "ژل و لاک", risk: "hot" as const },
  { id: "c6", name: "دنیا ابراهیمی", phone: "۰۹۳۶ ۲۲۲ ۳۳۴۴", tier: "طلایی" as Tier, visits: 18, total: 33_900_000, lastVisit: "۲۷ شهریور", lastVisitDays: 1, cycleDays: 38, favService: "رنگ ریشه", risk: "ok" as const },
  { id: "c7", name: "ژاله فرهادی", phone: "۰۹۱۰ ۵۵۵ ۶۶۷۷", tier: "نقره‌ای" as Tier, visits: 12, total: 18_600_000, lastVisit: "۳ مرداد", lastVisitDays: 56, cycleDays: 30, favService: "مانیکور", risk: "lost" as const },
];

export type Appt = { id: string; staffId: string; start: number; dur: number; client: string; service: string; cat: Category; status: "confirmed" | "pending" | "inservice" | "done"; };
// start = دقیقه از ساعت ۹ صبح
export const appts: Appt[] = [
  { id: "a1", staffId: "s1", start: 0, dur: 120, client: "دنیا ابراهیمی", service: "رنگ ریشه", cat: "مو", status: "done" },
  { id: "a2", staffId: "s1", start: 150, dur: 240, client: "پریسا نوری", service: "بالیاژ", cat: "مو", status: "inservice" },
  { id: "a3", staffId: "s1", start: 420, dur: 120, client: "سارا محمدی", service: "رنگ ریشه", cat: "مو", status: "confirmed" },
  { id: "a4", staffId: "s2", start: 30, dur: 180, client: "نیلوفر صادقی", service: "کراتین", cat: "مو", status: "done" },
  { id: "a5", staffId: "s2", start: 300, dur: 45, client: "الناز جعفری", service: "کوتاهی", cat: "مو", status: "confirmed" },
  { id: "a6", staffId: "s2", start: 360, dur: 180, client: "مهسا کاظمی", service: "کراتین", cat: "مو", status: "pending" },
  { id: "a7", staffId: "s3", start: 60, dur: 75, client: "ژاله فرهادی", service: "فیشال هیدرا", cat: "پوست", status: "done" },
  { id: "a8", staffId: "s3", start: 210, dur: 60, client: "مهسا کاظمی", service: "پاکسازی عمیق", cat: "پوست", status: "confirmed" },
  { id: "a9", staffId: "s4", start: 0, dur: 90, client: "الناز جعفری", service: "ژل و لاک", cat: "ناخن", status: "done" },
  { id: "a10", staffId: "s4", start: 120, dur: 45, client: "مهسا کاظمی", service: "مانیکور", cat: "ناخن", status: "confirmed" },
  { id: "a11", staffId: "s4", start: 300, dur: 90, client: "نیلوفر صادقی", service: "ژل و لاک", cat: "ناخن", status: "pending" },
];

export const waitlist = [
  { id: "w1", name: "ترانه امیری", want: "بالیاژ — مریم حسینی", window: "امروز، عصر" },
  { id: "w2", name: "شیوا مرادی", want: "فیشال — هر متخصص", window: "شنبه تا دوشنبه" },
];

export const smartSuggestions = [
  { id: "g1", name: "سارا محمدی", reason: "ترمیم رنگ ریشه", detail: "۴۲ روز از آخرین رنگ گذشته؛ زمان ایده‌آل ۲ مهر", staff: "مریم حسینی", slot: "شنبه ۱۷:۳۰", value: 1_800_000 },
  { id: "g2", name: "نیلوفر صادقی", reason: "تمدید کراتین", detail: "۳۹ روز از آخرین کراتین؛ معمولاً هر ۴۰ روز می‌آید", staff: "نازنین کریمی", slot: "سه‌شنبه ۱۱:۰۰", value: 3_800_000 },
  { id: "g3", name: "الناز جعفری", reason: "ژل و لاک", detail: "۴۷ روز از آخرین مراجعه", staff: "سارا احمدی", slot: "یکشنبه ۱۴:۰۰", value: 850_000 },
];

export const opportunities = [
  { icon: "lost", text: "۲۳ مشتری بیش از ۴۵ روز است مراجعه نکرده‌اند", cta: "ارسال کمپین بازگشت", href: "/campaigns", tone: "danger" },
  { icon: "vip", text: "۷ مشتری VIP این ماه هنوز نوبت نگرفته‌اند", cta: "پیشنهاد نوبت", href: "/customers", tone: "gold" },
  { icon: "slot", text: "ظرفیت ساعت ۱۵ تا ۱۸ امروز خالی است (۶ نوبت)", cta: "ارسال پیشنهاد لحظه‌ای", href: "/calendar", tone: "amber" },
  { icon: "stock", text: "موجودی اکسیدان ۶٪ به حداقل رسیده", cta: "ساخت سفارش تأمین", href: "/procurement", tone: "sky" },
];

export const week = [
  { d: "شنبه", v: 14.2 }, { d: "یکشنبه", v: 11.8 }, { d: "دوشنبه", v: 16.4 },
  { d: "سه‌شنبه", v: 12.9 }, { d: "چهارشنبه", v: 15.6 }, { d: "پنجشنبه", v: 21.3 }, { d: "جمعه", v: 18.5 },
];

export const svcProfit = [
  { name: "کراتین", profit: 71, rev: 34 },
  { name: "فیشال هیدرا", profit: 68, rev: 21 },
  { name: "رنگ ریشه", profit: 62, rev: 41 },
  { name: "بالیاژ", profit: 58, rev: 38 },
];

export const DAY_START = 9; // ساعت ۹ صبح
export const DAY_END = 19;
/** بازه‌های غیرقابل‌رزرو (دقیقه از ۹): استراحت یا مرخصی */
export const blocked: Record<string, { s: number; e: number; label: string }[]> = {
  s2: [{ s: 210, e: 240, label: "استراحت ناهار" }],
  s3: [{ s: 300, e: 330, label: "استراحت ناهار" }],
  s4: [{ s: 200, e: 230, label: "استراحت" }, { s: 480, e: 600, label: "مرخصی ساعتی" }],
};
export const NOW_MIN = 320; // ۱۴:۲۰
