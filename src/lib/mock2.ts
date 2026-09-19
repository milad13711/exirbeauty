import type { Category } from "./mock";

export const catalog: {
  id: string; cat: Category; name: string; price: number; min: number; staff: string[];
  materials: string; materialCost: number; commission: number; capacity: string; discount?: string; pkg?: string; active: boolean;
}[] = [
  { id: "v1", cat: "مو", name: "رنگ ریشه", price: 1_800_000, min: 120, staff: ["s1", "s2"], materials: "رنگ، اکسیدان، فویل", materialCost: 380_000, commission: 30, capacity: "۲ همزمان", active: true, pkg: "پکیج رنگ + ترمیم" },
  { id: "v2", cat: "مو", name: "بالیاژ", price: 4_500_000, min: 240, staff: ["s1"], materials: "پودر دکلره، رنگ، ماسک", materialCost: 1_100_000, commission: 30, capacity: "۱ همزمان", discount: "۱۰٪ اولین بار", active: true },
  { id: "v3", cat: "مو", name: "کراتین", price: 3_800_000, min: 180, staff: ["s2"], materials: "کراتین، شامپو پاک‌کننده", materialCost: 560_000, commission: 28, capacity: "۲ همزمان", pkg: "پکیج مراقبت مو", active: true },
  { id: "v4", cat: "مو", name: "کوتاهی", price: 650_000, min: 45, staff: ["s1", "s2"], materials: "—", materialCost: 40_000, commission: 35, capacity: "۳ همزمان", active: true },
  { id: "v5", cat: "پوست", name: "فیشال هیدرا", price: 1_900_000, min: 75, staff: ["s3"], materials: "ست هیدرا، ماسک، سرم", materialCost: 520_000, commission: 30, capacity: "۲ همزمان", pkg: "عضویت زیبایی", active: true },
  { id: "v6", cat: "پوست", name: "پاکسازی عمیق", price: 1_100_000, min: 60, staff: ["s3"], materials: "ژل، ماسک، دستکش", materialCost: 280_000, commission: 30, capacity: "۲ همزمان", active: true },
  { id: "v7", cat: "ناخن", name: "ژل و لاک", price: 850_000, min: 90, staff: ["s4"], materials: "ژل، لاک، فایل", materialCost: 290_000, commission: 33, capacity: "۲ همزمان", active: true },
  { id: "v8", cat: "ناخن", name: "مانیکور", price: 450_000, min: 45, staff: ["s4"], materials: "لوسیون، فایل", materialCost: 95_000, commission: 33, capacity: "۲ همزمان", active: true },
  { id: "v9", cat: "ناخن", name: "پدیکور", price: 600_000, min: 60, staff: ["s4"], materials: "نمک، لوسیون", materialCost: 110_000, commission: 33, capacity: "۲ همزمان", active: false },
];

export const invoices = [
  { id: "۱۰۴۲", client: "دنیا ابراهیمی", items: "رنگ ریشه", total: 1_800_000, method: "کارت", staff: "مریم حسینی", time: "۱۱:۰۵" },
  { id: "۱۰۴۳", client: "نیلوفر صادقی", items: "کراتین + شامپو ترمیم", total: 4_450_000, method: "آنلاین", staff: "نازنین کریمی", time: "۱۲:۲۰" },
  { id: "۱۰۴۴", client: "ژاله فرهادی", items: "فیشال هیدرا", total: 1_710_000, method: "نقدی", staff: "الهام رضایی", time: "۱۲:۴۰" },
  { id: "۱۰۴۵", client: "الناز جعفری", items: "ژل و لاک", total: 850_000, method: "بدهی", staff: "سارا احمدی", time: "۱۳:۱۰" },
];

export const expenses = [
  { t: "خرید اکسیدان و رنگ", v: 2_400_000 },
  { t: "قبض برق", v: 680_000 },
  { t: "پذیرایی", v: 320_000 },
];

export const posProducts = [
  { id: "p1", name: "شامپو ترمیم‌کننده", price: 650_000 },
  { id: "p2", name: "ماسک مو", price: 780_000 },
  { id: "p3", name: "سرم ویتامین C", price: 1_150_000 },
];

// قالب خدمات برای Onboarding سالن‌های جدید
export const serviceTemplates: { name: string; cat: "مو" | "پوست" | "ناخن" | "آرایش"; price: number; min: number }[] = [
  { name: "کوتاهی", cat: "مو", price: 650_000, min: 45 }, { name: "رنگ ریشه", cat: "مو", price: 1_800_000, min: 120 },
  { name: "مش و هایلایت", cat: "مو", price: 3_200_000, min: 180 }, { name: "بالیاژ", cat: "مو", price: 4_500_000, min: 240 },
  { name: "کراتین", cat: "مو", price: 3_800_000, min: 180 }, { name: "براشینگ و مدل مو", cat: "مو", price: 450_000, min: 45 },
  { name: "فیشال هیدرا", cat: "پوست", price: 1_900_000, min: 75 }, { name: "پاکسازی عمیق", cat: "پوست", price: 1_100_000, min: 60 },
  { name: "جوانسازی پوست", cat: "پوست", price: 2_400_000, min: 90 }, { name: "ژل و لاک", cat: "ناخن", price: 850_000, min: 90 },
  { name: "مانیکور", cat: "ناخن", price: 450_000, min: 45 }, { name: "پدیکور", cat: "ناخن", price: 600_000, min: 60 },
  { name: "میکاپ مجلسی", cat: "آرایش", price: 2_800_000, min: 90 }, { name: "لیفت و لمینت مژه", cat: "آرایش", price: 1_700_000, min: 60 },
];
