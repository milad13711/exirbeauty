// فروشگاه اکسیر (پلتفرم) — داده نمونه
export const CRM_PLAN = { name: "اشتراک ماهانه اکسیر بیوتی", price: 1_490_000, renewal: "۱۵ مهر ۱۴۰۵" };
export const RETURN_DAYS = 7; // پورسانت پس از پایان مهلت مرجوعی آزاد می‌شود

export type SCat = "مو" | "پوست" | "ناخن" | "ست هدیه";
export const storeProducts = [
  { id: "p1", name: "شامپو ترمیم‌کننده بدون سولفات", brand: "Silk Lab", cat: "مو" as SCat, price: 650_000, old: 720_000, commission: 12, rating: 4.8, stock: 40, tint: ["#f7e4ea", "#f6ecd6"], desc: "مخصوص موهای کراتینه و رنگ‌شده؛ ماندگاری نتیجه‌ی خدمات سالن را بیشتر می‌کند." },
  { id: "p2", name: "ماسک مو ابریشم", brand: "Silk Lab", cat: "مو" as SCat, price: 780_000, commission: 12, rating: 4.9, stock: 25, tint: ["#f6ecd6", "#f7e4ea"], desc: "ماسک عمیق برای ترمیم انتهای موی خشک و آسیب‌دیده." },
  { id: "p3", name: "سرم ویتامین C", brand: "Derma Rose", cat: "پوست" as SCat, price: 1_150_000, commission: 15, rating: 4.7, stock: 18, tint: ["#e0f0e8", "#f6ecd6"], desc: "روشن‌کننده و ضدلکه برای پوست ترکیبی و معمولی." },
  { id: "p4", name: "ضدآفتاب SPF50 بی‌رنگ", brand: "Derma Rose", cat: "پوست" as SCat, price: 540_000, commission: 15, rating: 4.6, stock: 60, tint: ["#e1edf8", "#e0f0e8"], desc: "سبک، بدون سفیدی روی پوست، مناسب زیر آرایش." },
  { id: "p5", name: "روغن آرگان خالص", brand: "Argania", cat: "مو" as SCat, price: 890_000, commission: 10, rating: 4.8, stock: 32, tint: ["#f6ecd6", "#fbeed6"], desc: "براق‌کننده و محافظ حرارتی، بدون چربی‌ماندگی." },
  { id: "p3b", name: "ست ژل و لاک خانگی", brand: "Nail Muse", cat: "ناخن" as SCat, price: 1_350_000, commission: 14, rating: 4.5, stock: 12, tint: ["#f7e4ea", "#e1edf8"], desc: "چراغ UV، ۶ رنگ پرطرفدار، پایه و تاپ‌کوت." },
  { id: "p6", name: "ست مراقبت رنگ مو", brand: "Silk Lab", cat: "ست هدیه" as SCat, price: 1_900_000, old: 2_150_000, commission: 18, rating: 5.0, stock: 15, tint: ["#f7e4ea", "#f6ecd6"], desc: "شامپو، ماسک و سرم در یک جعبه‌ی هدیه." },
  { id: "p7", name: "کرم آبرسان شب", brand: "Derma Rose", cat: "پوست" as SCat, price: 980_000, commission: 15, rating: 4.7, stock: 22, tint: ["#e0f0e8", "#f7e4ea"], desc: "آبرسانی عمیق در طول شب با هیالورونیک‌اسید." },
];
export const catList: ("همه" | SCat)[] = ["همه", "مو", "پوست", "ناخن", "ست هدیه"];

export const salons = [
  { id: "s1", code: "rose", name: "سالن رُز", owner: "مهسا رحیمی", city: "تهران", wallet: 1_180_000, pending: 420_000, orders: 37, sales: 41_600_000, since: "فروردین ۱۴۰۵" },
  { id: "s2", code: "mahtab", name: "آرایشگاه ماهتاب", owner: "زهرا کاظمی", city: "اصفهان", wallet: 640_000, pending: 210_000, orders: 21, sales: 22_300_000, since: "اردیبهشت ۱۴۰۵" },
  { id: "s3", code: "nilo", name: "سالن نیلو", owner: "نیلوفر امینی", city: "شیراز", wallet: 1_490_000, pending: 0, orders: 54, sales: 63_800_000, since: "اسفند ۱۴۰۴" },
  { id: "s4", code: "parsa", name: "بیوتی پارسا", owner: "پرستو نادری", city: "مشهد", wallet: 90_000, pending: 130_000, orders: 6, sales: 6_900_000, since: "تیر ۱۴۰۵" },
];

export type OrderStatus = "پرداخت‌شده" | "ارسال‌شده" | "تحویل‌شده" | "مرجوعی";
export type CommStatus = "در انتظار مهلت مرجوعی" | "آماده شارژ" | "شارژ شد" | "لغو شد";
export const ordersSeed: { id: string; date: string; customer: string; phone: string; items: string; total: number; salon: string; via: string; status: OrderStatus; comm: number; cs: CommStatus }[] = [
  { id: "۲۰۳۱", date: "۲۸ شهریور", customer: "سارا محمدی", phone: "۰۹۱۲۳۴۵۶۷۸۹", items: "ست مراقبت رنگ مو", total: 1_900_000, salon: "s1", via: "لینک اختصاصی سالن", status: "پرداخت‌شده", comm: 342_000, cs: "در انتظار مهلت مرجوعی" },
  { id: "۲۰۳۰", date: "۲۷ شهریور", customer: "دنیا ابراهیمی", phone: "۰۹۳۶۲۲۲۳۳۴۴", items: "سرم ویتامین C + ضدآفتاب", total: 1_690_000, salon: "s1", via: "لینک متخصص: مریم حسینی", status: "ارسال‌شده", comm: 253_500, cs: "در انتظار مهلت مرجوعی" },
  { id: "۲۰۲۹", date: "۲۰ شهریور", customer: "ژاله فرهادی", phone: "۰۹۱۰۵۵۵۶۶۷۷", items: "ماسک مو ابریشم", total: 780_000, salon: "s2", via: "لینک اختصاصی سالن", status: "تحویل‌شده", comm: 93_600, cs: "آماده شارژ" },
  { id: "۲۰۲۸", date: "۱۸ شهریور", customer: "نیلوفر صادقی", phone: "۰۹۱۲۱۱۱۲۲۳۳", items: "شامپو ترمیم‌کننده", total: 650_000, salon: "s1", via: "لینک مشتری: سارا محمدی", status: "تحویل‌شده", comm: 78_000, cs: "آماده شارژ" },
  { id: "۲۰۲۷", date: "۱۴ شهریور", customer: "مهسا کاظمی", phone: "۰۹۱۹۷۷۷۸۸۹۹", items: "کرم آبرسان شب", total: 980_000, salon: "s3", via: "لینک اختصاصی سالن", status: "تحویل‌شده", comm: 147_000, cs: "شارژ شد" },
  { id: "۲۰۲۶", date: "۱۲ شهریور", customer: "الناز جعفری", phone: "۰۹۱۲۹۹۹۰۰۱۱", items: "ست ژل و لاک خانگی", total: 1_350_000, salon: "s4", via: "لینک اختصاصی سالن", status: "مرجوعی", comm: 0, cs: "لغو شد" },
  { id: "۲۰۲۵", date: "۸ شهریور", customer: "پریسا نوری", phone: "۰۹۳۵۴۴۴۵۵۶۶", items: "روغن آرگان + ماسک", total: 1_670_000, salon: "s2", via: "لینک مشتری: ژاله فرهادی", status: "تحویل‌شده", comm: 200_400, cs: "شارژ شد" },
];
