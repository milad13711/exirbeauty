// داده نمونه پنل ادمین: پلن‌ها، تننت‌ها، دوره‌ها، ریفرال مارکتینگ
export const plans = [
  { id: "basic", name: "پایه", price: 790_000, users: 3, customers: 500, features: ["مشتریان و تقویم", "صندوق ساده", "پیامک یادآوری"], subs: 21 },
  { id: "pro", name: "حرفه‌ای", price: 1_490_000, users: 10, customers: 3000, features: ["همه‌ی امکانات پایه", "باشگاه مشتریان و ریفرال", "کمپین و اتوماسیون", "فروشگاه معرفی"], subs: 34, hot: true },
  { id: "elite", name: "سازمانی", price: 2_900_000, users: 30, customers: 20000, features: ["همه‌ی امکانات حرفه‌ای", "چند شعبه", "مدیر هوشمند AI", "پشتیبانی اختصاصی"], subs: 9 },
];
export const durationDiscount = [{ m: 1, off: 0 }, { m: 3, off: 5 }, { m: 6, off: 10 }, { m: 12, off: 20 }];

export type TStatus = "فعال" | "آزمایشی" | "منقضی‌شده" | "تعلیق";
export const tenants: { id: string; name: string; owner: string; city: string; phone: string; plan: string; status: TStatus; expiry: string; users: number; customers: number; wallet: number; since: string }[] = [
  { id: "t1", name: "سالن رُز", owner: "مهسا رحیمی", city: "تهران", phone: "۰۹۱۲۱۱۱۲۲۳۳", plan: "pro", status: "فعال", expiry: "۱۵ مهر ۱۴۰۵", users: 6, customers: 1240, wallet: 1_180_000, since: "فروردین ۱۴۰۵" },
  { id: "t2", name: "آرایشگاه ماهتاب", owner: "زهرا کاظمی", city: "اصفهان", phone: "۰۹۱۳۲۲۲۳۳۴۴", plan: "basic", status: "فعال", expiry: "۳ آبان ۱۴۰۵", users: 3, customers: 410, wallet: 640_000, since: "اردیبهشت ۱۴۰۵" },
  { id: "t3", name: "سالن نیلو", owner: "نیلوفر امینی", city: "شیراز", phone: "۰۹۱۷۳۳۳۴۴۵۵", plan: "elite", status: "فعال", expiry: "۲۰ آذر ۱۴۰۵", users: 18, customers: 5200, wallet: 1_490_000, since: "اسفند ۱۴۰۴" },
  { id: "t4", name: "بیوتی پارسا", owner: "پرستو نادری", city: "مشهد", phone: "۰۹۱۵۴۴۴۵۵۶۶", plan: "pro", status: "آزمایشی", expiry: "۵ مهر ۱۴۰۵", users: 2, customers: 96, wallet: 90_000, since: "شهریور ۱۴۰۵" },
  { id: "t5", name: "سالن آبان", owner: "مریم صادقی", city: "تبریز", phone: "۰۹۱۴۵۵۵۶۶۷۷", plan: "basic", status: "منقضی‌شده", expiry: "۲۲ شهریور ۱۴۰۵", users: 3, customers: 280, wallet: 0, since: "دی ۱۴۰۴" },
  { id: "t6", name: "رزا بیوتی", owner: "سمیرا حیدری", city: "کرج", phone: "۰۹۱۲۶۶۶۷۷۸۸", plan: "pro", status: "فعال", expiry: "۹ مهر ۱۴۰۵", users: 7, customers: 1510, wallet: 320_000, since: "بهمن ۱۴۰۴" },
  { id: "t7", name: "سالن گیسو", owner: "ندا رحمانی", city: "تهران", phone: "۰۹۳۵۷۷۷۸۸۹۹", plan: "basic", status: "تعلیق", expiry: "۱ شهریور ۱۴۰۵", users: 2, customers: 150, wallet: 0, since: "مهر ۱۴۰۴" },
];

export const courses: { id: string; title: string; audience: "مدیر سالن" | "متخصص"; price: number; lessons: number; hours: number; students: number; published: boolean; inPlan: string }[] = [
  { id: "c1", title: "قیمت‌گذاری خدمات سالن", audience: "مدیر سالن", price: 0, lessons: 8, hours: 2, students: 212, published: true, inPlan: "همه‌ی پلن‌ها" },
  { id: "c2", title: "سیستم بازگشت مشتری و اتوماسیون", audience: "مدیر سالن", price: 690_000, lessons: 12, hours: 4, students: 96, published: true, inPlan: "حرفه‌ای و بالاتر" },
  { id: "c3", title: "ترندهای بالیاژ ۱۴۰۵", audience: "متخصص", price: 1_200_000, lessons: 10, hours: 5, students: 143, published: true, inPlan: "—" },
  { id: "c4", title: "فروش محصول بعد از خدمت", audience: "متخصص", price: 0, lessons: 6, hours: 1.5, students: 180, published: true, inPlan: "همه‌ی پلن‌ها" },
  { id: "c5", title: "مدیریت پرسنل و پورسانت", audience: "مدیر سالن", price: 890_000, lessons: 9, hours: 3, students: 0, published: false, inPlan: "سازمانی" },
];

export const refPrograms = [
  { id: "shop", name: "پورسانت فروشگاه", desc: "سالن از هر خرید مشتریان معرفی‌شده‌اش پورسانت می‌گیرد", value: "۱۰ تا ۱۸٪ (به‌تفکیک محصول)", on: true },
  { id: "salon", name: "معرفی سالن جدید", desc: "سالنی که سالن دیگری را به CRM بیاورد بعد از اولین پرداخت اعتبار می‌گیرد", value: "۳۰۰٬۰۰۰ تومان اعتبار کیف پول", on: true },
];
export const boosts = [
  { id: "b1", name: "پورسانت ۲ برابر آخر هفته", range: "پنجشنبه و جمعه", scope: "همه‌ی محصولات", on: true },
  { id: "b2", name: "جشنواره‌ی مراقبت پاییزی", range: "۱ تا ۱۵ مهر", scope: "دسته‌ی مو", on: false },
];
export const kit = ["بنر استوری اینستاگرام", "کارت QR برای میز پذیرش", "متن آماده‌ی پیام به مشتری", "کاتالوگ PDF محصولات"];
