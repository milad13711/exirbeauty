// داده‌ی اولیه‌ی صندوق، انبار سالن، باشگاه، کمپین و … (نمونه)
import type { Category } from "./mock";

export type PayMethod = "نقدی" | "کارت" | "آنلاین" | "کیف پول" | "کارت هدیه";
export type SaleLine = { kind: "service" | "product" | "membership"; refId: string; name: string; qty: number; price: number; staffId?: string; commissionPct?: number };
export type Sale = { id: string; day: number; time: string; customerId: string | null; customerName: string; lines: SaleLine[]; subtotal: number; discountPct: number; discount: number; total: number; pays: { method: PayMethod; amount: number; ref?: string }[]; debt: number; status: "پرداخت‌شده" | "بدهکار" | "باطل"; earned: number; walletUsed: number; apptId?: string; note?: string; voidReason?: string };
export type Expense = { id: string; day: number; title: string; amount: number; method: "نقدی" | "کارت"; cat: string };
export type DebtPayment = { id: string; day: number; customerId: string; amount: number; method: "نقدی" | "کارت" | "آنلاین" };
export type DayClosing = { day: number; expectedCash: number; countedCash: number; note: string };
export type StockItem = { id: string; name: string; kind: "retail" | "consumable"; price: number; cost: number; stock: number; reorder: number; supplier: string };

export type WaitEntry = { id: string; name: string; phone: string; serviceId: string; staffId: string; from: number; to: number; note: string; status: "منتظر" | "اطلاع داده شد" | "رزرو شد" | "لغو"; customerId?: string };

export type LoyaltyTier = { name: "برنزی" | "نقره‌ای" | "طلایی" | "VIP"; from: number; off: number; perks: string };
export type EarnRule = { id: string; label: string; pts: number; per?: number };
export type Reward = { id: string; name: string; cost: number; kind: "wallet" | "free" | "product"; value: number };
export type Loyalty = { tiers: LoyaltyTier[]; earn: EarnRule[]; rewards: Reward[] };
export type ReferralCfg = { enabled: boolean; referrerPts: number; friendOff: number; staffPct: number };
export type Segment = { inactiveDays?: number; tiers?: string[]; birthdayMonth?: boolean; minSpend?: number; favService?: string };
export type Campaign = { id: string; name: string; day: number; channel: string; message: string; segment: Segment; count: number; ids: string[]; status: "ارسال‌شده" | "زمان‌بندی‌شده"; whenDay?: number };
export type AutoKind = "inactive" | "cycle" | "afterPurchase" | "birthday" | "winback";
export type AutoRule = { id: string; kind: AutoKind; days: number; message: string; gift: string; on: boolean; sent: number; back: number };
export type MembershipPlan = { id: string; name: string; price: number; months: number; credits: number; creditLabel: string; perks: string[]; active: boolean };
export type Membership = { id: string; customerId: string; planId: string; start: number; expiry: number; credits: number; status: "فعال" | "منقضی" };
export type GiftCard = { id: string; code: string; amount: number; balance: number; fromName: string; toName: string; toPhone: string; occasion: string; message: string; day: number; status: "فعال" | "استفاده‌شده" | "باطل" };

// PRNG قطعی تا دموی گزارش‌ها همیشه یکسان باشد
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

type Base = { services: { id: string; name: string; price: number; cat: Category; staff: string[]; commission: number }[]; staff: { id: string; name: string }[]; customers: { id: string; name: string }[]; retail: StockItem[] };

export function seedExtra(b: Base) {
  const stock: StockItem[] = [
    ...b.retail,
    { id: "k1", name: "اکسیدان ۶٪ (بسته)", kind: "consumable", price: 0, cost: 300_000, stock: 2, reorder: 6, supplier: "پخش رز" },
    { id: "k2", name: "رنگ مو ۷.۳", kind: "consumable", price: 0, cost: 420_000, stock: 5, reorder: 8, supplier: "پخش رز" },
    { id: "k3", name: "کراتین", kind: "consumable", price: 0, cost: 950_000, stock: 3, reorder: 3, supplier: "آرین‌مد" },
    { id: "k4", name: "دستکش نیتریل (۱۰۰ عدد)", kind: "consumable", price: 0, cost: 420_000, stock: 14, reorder: 5, supplier: "بهداشت‌پارس" },
  ];
  const r = rng(1405);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const times = ["۰۹:۴۵", "۱۰:۳۰", "۱۱:۱۵", "۱۲:۴۰", "۱۳:۵۰", "۱۵:۱۰", "۱۶:۲۰", "۱۷:۴۵"];
  const sales: Sale[] = [];
  let n = 1000;
  for (let day = -29; day <= -1; day++) {
    const count = 3 + Math.floor(r() * 5);
    for (let i = 0; i < count; i++) {
      const sv = pick(b.services); const st = b.staff.find((x) => sv.staff.includes(x.id)) ?? b.staff[0]; const cu = pick(b.customers);
      const lines: SaleLine[] = [{ kind: "service", refId: sv.id, name: sv.name, qty: 1, price: sv.price, staffId: st.id, commissionPct: sv.commission }];
      if (r() < 0.3) { const p = pick(b.retail); lines.push({ kind: "product", refId: p.id, name: p.name, qty: 1, price: p.price }); }
      const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
      const off = r() < 0.25 ? 10 : 0; const discount = Math.round((subtotal * off) / 100); const total = subtotal - discount;
      const method = pick<"نقدی" | "کارت" | "آنلاین">(["کارت", "کارت", "نقدی", "آنلاین"]);
      sales.push({ id: `H-${++n}`, day, time: pick(times), customerId: cu.id, customerName: cu.name, lines, subtotal, discountPct: off, discount, total, pays: [{ method, amount: total }], debt: 0, status: "پرداخت‌شده", earned: Math.floor(total / 100_000) * 10, walletUsed: 0 });
    }
  }
  const byName = (nm: string) => b.customers.find((c) => c.name === nm)?.id ?? null;
  const svc = (id: string) => b.services.find((s) => s.id === id)!;
  const line = (id: string, staffId: string): SaleLine => { const s = svc(id); return { kind: "service", refId: id, name: s.name, qty: 1, price: s.price, staffId, commissionPct: s.commission }; };
  const today: Sale[] = [
    { id: "F-1042", day: 0, time: "۱۱:۰۵", customerId: byName("دنیا ابراهیمی"), customerName: "دنیا ابراهیمی", lines: [line("v1", "s1")], subtotal: 1_800_000, discountPct: 0, discount: 0, total: 1_800_000, pays: [{ method: "کارت", amount: 1_800_000 }], debt: 0, status: "پرداخت‌شده", earned: 180, walletUsed: 0 },
    { id: "F-1043", day: 0, time: "۱۲:۲۰", customerId: byName("نیلوفر صادقی"), customerName: "نیلوفر صادقی", lines: [line("v3", "s2"), { kind: "product", refId: "r1", name: "شامپو ترمیم‌کننده", qty: 1, price: 650_000 }], subtotal: 4_450_000, discountPct: 0, discount: 0, total: 4_450_000, pays: [{ method: "آنلاین", amount: 4_450_000 }], debt: 0, status: "پرداخت‌شده", earned: 480, walletUsed: 0 },
    { id: "F-1044", day: 0, time: "۱۲:۴۰", customerId: byName("ژاله فرهادی"), customerName: "ژاله فرهادی", lines: [line("v5", "s3")], subtotal: 1_900_000, discountPct: 10, discount: 190_000, total: 1_710_000, pays: [{ method: "نقدی", amount: 1_710_000 }], debt: 0, status: "پرداخت‌شده", earned: 170, walletUsed: 0 },
    { id: "F-1045", day: 0, time: "۱۳:۱۰", customerId: byName("الناز جعفری"), customerName: "الناز جعفری", lines: [line("v7", "s4")], subtotal: 850_000, discountPct: 0, discount: 0, total: 850_000, pays: [], debt: 850_000, status: "بدهکار", earned: 80, walletUsed: 0 },
  ];
  const expenses: Expense[] = [
    { id: "e1", day: 0, title: "خرید اکسیدان و رنگ", amount: 2_400_000, method: "کارت", cat: "مواد مصرفی" },
    { id: "e2", day: 0, title: "قبض برق", amount: 680_000, method: "کارت", cat: "قبوض" },
    { id: "e3", day: 0, title: "پذیرایی", amount: 320_000, method: "نقدی", cat: "متفرقه" },
    ...Array.from({ length: 10 }, (_, i): Expense => ({ id: `eh${i}`, day: -(2 + i * 3), title: pick(["خرید مواد مصرفی", "پذیرایی", "حمل‌ونقل", "تعمیرات"]), amount: pick([350_000, 520_000, 1_200_000, 2_100_000]), method: pick<"نقدی" | "کارت">(["نقدی", "کارت"]), cat: "متفرقه" })),
  ];
  const loyalty: Loyalty = {
    tiers: [{ name: "برنزی", from: 0, off: 0, perks: "امتیاز پایه" }, { name: "نقره‌ای", from: 500, off: 5, perks: "۵٪ تخفیف خدمات" }, { name: "طلایی", from: 1200, off: 8, perks: "۸٪ تخفیف + اولویت رزرو" }, { name: "VIP", from: 2000, off: 10, perks: "۱۰٪ تخفیف + هدیه تولد + اولویت" }],
    earn: [{ id: "visit", label: "هر مراجعه", pts: 50 }, { id: "svc", label: "خرید خدمت (به‌ازای هر ۱۰۰ هزار تومان)", pts: 10, per: 100_000 }, { id: "prod", label: "خرید محصول (به‌ازای هر ۱۰۰ هزار تومان)", pts: 15, per: 100_000 }, { id: "ref", label: "معرفی دوست (پس از اولین خرید)", pts: 100 }, { id: "review", label: "ثبت نظر", pts: 20 }, { id: "bday", label: "تولد", pts: 100 }],
    rewards: [{ id: "w1", name: "اعتبار ۵۰ هزار تومانی", cost: 500, kind: "wallet", value: 50_000 }, { id: "w2", name: "اعتبار ۲۰۰ هزار تومانی", cost: 1800, kind: "wallet", value: 200_000 }, { id: "w3", name: "ژل ناخن رایگان", cost: 1200, kind: "free", value: 850_000 }],
  };
  const automations: AutoRule[] = [
    { id: "au1", kind: "inactive", days: 45, message: "{name} جان، دلمون برات تنگ شده 💗 برای رزرو نوبت اقدام کن.", gift: "", on: true, sent: 64, back: 19 },
    { id: "au2", kind: "cycle", days: 3, message: "{name} عزیز، وقت ترمیم شما نزدیک شده است. همین حالا نوبت بگیرید.", gift: "", on: true, sent: 92, back: 41 },
    { id: "au3", kind: "afterPurchase", days: 1, message: "{name} جان، برای حفظ نتیجه‌ی خدمت این محصولات را پیشنهاد می‌کنیم.", gift: "", on: true, sent: 48, back: 11 },
    { id: "au4", kind: "birthday", days: 0, message: "تولدت مبارک {name} 🎂 هدیه‌ی ما یک فیشال رایگان!", gift: "فیشال رایگان", on: true, sent: 17, back: 9 },
    { id: "au5", kind: "winback", days: 90, message: "{name} جان، ۱۵٪ تخفیف ویژه‌ی بازگشت برای شما فعال شد.", gift: "۱۵٪ تخفیف", on: false, sent: 23, back: 5 },
  ];
  const memPlans: MembershipPlan[] = [
    { id: "mp1", name: "Beauty Membership", price: 999_000, months: 1, credits: 1, creditLabel: "فیشال", perks: ["یک فیشال در ماه", "۱۰٪ تخفیف خدمات", "امتیاز دو برابر", "اولویت رزرو"], active: true },
    { id: "mp2", name: "Hair Care Club", price: 1_490_000, months: 1, credits: 2, creditLabel: "ماسک و براشینگ", perks: ["دو ماسک و براشینگ", "۱۵٪ تخفیف رنگ و کراتین", "اولویت رزرو"], active: true },
  ];
  const giftCards: GiftCard[] = [
    { id: "g1", code: "GC-4821-7730", amount: 2_000_000, balance: 2_000_000, fromName: "سارا محمدی", toName: "مادر سارا", toPhone: "۰۹۱۲۰۰۰۱۱۱۱", occasion: "روز مادر", message: "به بهانه‌ی روز مادر", day: -5, status: "فعال" },
    { id: "g2", code: "GC-1190-2245", amount: 1_000_000, balance: 0, fromName: "پریسا نوری", toName: "نیلوفر", toPhone: "۰۹۱۲۰۰۰۲۲۲۲", occasion: "تولد", message: "تولدت مبارک", day: -12, status: "استفاده‌شده" },
  ];
  return {
    inv: stock, sales: [...sales, ...today], expenses, debtPays: [] as DebtPayment[], closings: [] as DayClosing[], saleSeq: 1046, waitlist: [
      { id: "w1", name: "ترانه امیری", phone: "۰۹۱۲۳۰۰۱۱۲۲", serviceId: "v2", staffId: "s1", from: 0, to: 3, note: "ترجیحاً عصر", status: "منتظر" },
      { id: "w2", name: "شیوا مرادی", phone: "۰۹۳۵۴۰۰۲۲۳۳", serviceId: "v5", staffId: "any", from: 0, to: 2, note: "", status: "منتظر" },
    ] as WaitEntry[],
    loyalty, referral: { enabled: true, referrerPts: 100, friendOff: 10, staffPct: 5 } as ReferralCfg, campaigns: [
      { id: "cp1", name: "بازگشت تابستان", day: -20, channel: "پیامک", message: "دلتنگت شدیم ❤️", segment: { inactiveDays: 60 }, count: 84, ids: [], status: "ارسال‌شده" },
      { id: "cp2", name: "تخفیف کراتین", day: -44, channel: "واتساپ", message: "تخفیف ویژه کراتین", segment: { favService: "کراتین" }, count: 120, ids: [], status: "ارسال‌شده" },
    ] as Campaign[], automations, memPlans, memberships: [] as Membership[], giftCards, portal: null as string | null,
  };
}
