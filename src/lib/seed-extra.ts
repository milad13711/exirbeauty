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
export type AutoKind = "inactive" | "cycle" | "afterPurchase" | "birthday" | "winback" | "reminder24" | "reminder2" | "confirm" | "thanks" | "capacity" | "debt" | "welcome" | "expiry";
export type AutoRule = { id: string; kind: AutoKind; days: number; message: string; gift: string; on: boolean; sent: number; back: number; window: [number, number]; dailyCap: number; perCustomer30: number; approval: boolean };
export type MembershipPlan = { id: string; name: string; price: number; months: number; credits: number; creditLabel: string; perks: string[]; active: boolean };
export type Membership = { id: string; customerId: string; planId: string; start: number; expiry: number; credits: number; status: "فعال" | "منقضی" };
export type GiftCard = { id: string; code: string; amount: number; balance: number; fromName: string; toName: string; toPhone: string; occasion: string; message: string; day: number; status: "فعال" | "استفاده‌شده" | "باطل" };

// PRNG قطعی تا دموی گزارش‌ها همیشه یکسان باشد
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

type Base = { services: { id: string; name: string; price: number; cat: Category; staff: string[]; commission: number }[]; staff: { id: string; name: string }[]; customers: { id: string; name: string; phone: string }[]; retail: StockItem[] };

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
      const sv = pick(b.services); const st = b.staff.find((x) => sv.staff.includes(x.id)) ?? b.staff[0]; const cu = pick(b.customers); const linked = r() < 0.35;
      const lines: SaleLine[] = [{ kind: "service", refId: sv.id, name: sv.name, qty: 1, price: sv.price, staffId: st.id, commissionPct: sv.commission }];
      if (r() < 0.3) { const p = pick(b.retail); lines.push({ kind: "product", refId: p.id, name: p.name, qty: 1, price: p.price }); }
      const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
      const off = r() < 0.25 ? 10 : 0; const discount = Math.round((subtotal * off) / 100); const total = subtotal - discount;
      const method = pick<"نقدی" | "کارت" | "آنلاین">(["کارت", "کارت", "نقدی", "آنلاین"]);
      sales.push({ id: `H-${++n}`, day, time: pick(times), customerId: linked ? cu.id : null, customerName: linked ? cu.name : "مراجعه‌ی حضوری", lines, subtotal, discountPct: off, discount, total, pays: [{ method, amount: total }], debt: 0, status: "پرداخت‌شده", earned: Math.floor(total / 100_000) * 10, walletUsed: 0 });
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
  const A = (id: string, kind: AutoKind, days: number, message: string, on: boolean, sent: number, back: number, o: Partial<AutoRule> = {}): AutoRule => ({ id, kind, days, message, gift: "", on, sent, back, window: [9, 21], dailyCap: 60, perCustomer30: 2, approval: false, ...o });
  const automations: AutoRule[] = [
    A("au1", "reminder24", 1, "{name} عزیز، یادآوری نوبت فردا ساعت {time} برای {service} در {salon}. برای تغییر: {link}", true, 210, 0, { perCustomer30: 8 }),
    A("au2", "reminder2", 0, "{name} جان، نوبت شما ساعت {time} در {salon} است. منتظرتان هستیم 🌸", true, 118, 0, { perCustomer30: 8 }),
    A("au3", "confirm", 0, "{name} عزیز، نوبت {service} شما در {salon} ثبت شد ({time}).", true, 96, 0, { perCustomer30: 8 }),
    A("au4", "inactive", 45, "{name} جان، دلمون برات تنگ شده 💗 برای رزرو نوبت اقدام کن: {link}", true, 64, 19),
    A("au5", "cycle", 3, "{name} عزیز، وقت ترمیم شما نزدیک شده است. همین حالا نوبت بگیرید: {link}", true, 92, 41),
    A("au6", "birthday", 0, "تولدت مبارک {name} 🎂 هدیه‌ی ما: {gift}. برای رزرو: {link}", true, 17, 9, { gift: "فیشال رایگان", perCustomer30: 1 }),
    A("au7", "thanks", 1, "{name} جان، ممنون از حضورتان در {salon} 💛 نظرتان را در پنل خود ثبت کنید و امتیاز بگیرید.", false, 0, 0, { perCustomer30: 4 }),
    A("au8", "capacity", 1, "{name} عزیز، فردا در {salon} وقت خالی داریم و {gift}. رزرو: {link}", false, 0, 0, { gift: "۱۰٪ تخفیف ویژه", dailyCap: 30 }),
    A("au9", "afterPurchase", 1, "{name} جان، برای حفظ نتیجه‌ی خدمت، محصولات مراقبتی پیشنهادی ما را ببینید: {link}", true, 48, 11),
    A("au10", "winback", 90, "{name} جان، {gift} برای بازگشت شما فعال شد. رزرو: {link}", false, 23, 5, { gift: "۱۵٪ تخفیف", approval: true }),
    A("au11", "debt", 0, "{name} عزیز، مبلغ {debt} تومان از خدمات قبلی شما در {salon} باقی مانده است. ممنون از تسویه.", false, 0, 0, { perCustomer30: 1 }),
    A("au12", "welcome", 0, "{name} عزیز، به {salon} خوش آمدید 🌸 ثبت‌نام شما تکمیل شد. رزرو نوبت: {link}", false, 0, 0, { perCustomer30: 1 }),
    A("au13", "expiry", 7, "{name} جان، اعتبار عضویت شما تا {days} روز دیگر تمام می‌شود. برای تمدید با ما تماس بگیرید.", false, 0, 0, { perCustomer30: 1 }),
  ];
  const memPlans: MembershipPlan[] = [
    { id: "mp1", name: "Beauty Membership", price: 999_000, months: 1, credits: 1, creditLabel: "فیشال", perks: ["یک فیشال در ماه", "۱۰٪ تخفیف خدمات", "امتیاز دو برابر", "اولویت رزرو"], active: true },
    { id: "mp2", name: "Hair Care Club", price: 1_490_000, months: 1, credits: 2, creditLabel: "ماسک و براشینگ", perks: ["دو ماسک و براشینگ", "۱۵٪ تخفیف رنگ و کراتین", "اولویت رزرو"], active: true },
  ];
  const giftCards: GiftCard[] = [
    { id: "g1", code: "GC-4821-7730", amount: 2_000_000, balance: 2_000_000, fromName: "سارا محمدی", toName: "مادر سارا", toPhone: "۰۹۱۲۰۰۰۱۱۱۱", occasion: "روز مادر", message: "به بهانه‌ی روز مادر", day: -5, status: "فعال" },
    { id: "g2", code: "GC-1190-2245", amount: 1_000_000, balance: 0, fromName: "پریسا نوری", toName: "نیلوفر", toPhone: "۰۹۱۲۰۰۰۲۲۲۲", occasion: "تولد", message: "تولدت مبارک", day: -12, status: "استفاده‌شده" },
  ];
  // ---- پیامک: تاریخچه‌ی ارسال مرتبط با فروش‌های واقعی (برای سنجش بازده)
  const SAMPLE: Record<string, string> = { reminder24: "یادآوری نوبت فردا", reminder2: "نوبت شما ۲ ساعت دیگر است", inactive: "دلمون برات تنگ شده", cycle: "وقت ترمیم شما نزدیک شده", thanks: "ممنون از حضورتان", birthday: "تولدت مبارک" };
  const weights: [string, number][] = [["reminder24", 30], ["reminder2", 20], ["thanks", 10], ["inactive", 15], ["cycle", 15], ["birthday", 5], ["campaign", 5]];
  const pickScen = () => { let x = r() * 100; for (const [k, w] of weights) { if ((x -= w) < 0) return k; } return "reminder24"; };
  SAMPLE.campaign = "پیشنهاد ویژه‌ی این هفته";
  const smsLog: SmsMsg[] = []; let sk = 0;
  for (let i = 0; i < 900; i++) {
    const c = pick(b.customers); const sc = pickScen();
    smsLog.push({ id: `sm${++sk}`, tenantId: "t1", day: -Math.floor(r() * 30), time: pick(times), customerId: c.id, name: c.name, phone: c.phone, scenario: sc, text: SAMPLE[sc], parts: 1, status: r() < 0.04 ? "ناموفق" : "ارسال‌شده" });
  }
  const smsLine = (kind: "shared" | "dedicated", number: string): SmsLine => ({ kind, number, status: "فعال", requestedAt: -60 });
  const ar = { on: false, threshold: 150, packageId: "p2", source: "online" as const };
  const smsAccounts: SmsAccount[] = [
    { tenantId: "t1", balance: 1240, line: smsLine("shared", "30005050"), autoRecharge: ar, lowAlertSent: false, sent30: smsLog.filter((m) => m.day >= -29).length, lastTopup: -33, optOut: true },
    { tenantId: "t2", balance: 85, line: smsLine("shared", "30005050"), autoRecharge: ar, lowAlertSent: true, sent30: 210, lastTopup: -10, optOut: true },
    { tenantId: "t3", balance: 8200, line: smsLine("dedicated", "50004321"), autoRecharge: { ...ar, on: true }, lowAlertSent: false, sent30: 5400, lastTopup: -5, optOut: true },
    { tenantId: "t4", balance: 50, line: smsLine("shared", "30005050"), autoRecharge: ar, lowAlertSent: false, sent30: 18, lastTopup: -3, optOut: true },
    { tenantId: "t5", balance: 0, line: smsLine("shared", "30005050"), autoRecharge: ar, lowAlertSent: true, sent30: 40, lastTopup: -50, optOut: true },
    { tenantId: "t6", balance: 320, line: smsLine("shared", "30005050"), autoRecharge: ar, lowAlertSent: false, sent30: 780, lastTopup: -18, optOut: true },
    { tenantId: "t7", balance: 0, line: smsLine("shared", "30005050"), autoRecharge: ar, lowAlertSent: true, sent30: 0, lastTopup: -80, optOut: true },
  ];
  const smsTx: SmsTx[] = [
    { id: "x1", tenantId: "t1", day: -40, kind: "هدیه", amount: 0, credits: 50, method: "—", note: "هدیه‌ی ثبت‌نام" },
    { id: "x2", tenantId: "t1", day: -33, kind: "شارژ", amount: 450_000, credits: 5250, method: "آنلاین", note: "بسته‌ی ۵٬۰۰۰ تایی + ۵٪ هدیه" },
    { id: "x3", tenantId: "t3", day: -25, kind: "شارژ", amount: 1_700_000, credits: 22000, method: "آنلاین", note: "بسته‌ی ۲۰٬۰۰۰ تایی + ۱۰٪ هدیه" },
    { id: "x4", tenantId: "t3", day: -5, kind: "شارژ", amount: 1_700_000, credits: 22000, method: "کیف پول", note: "شارژ خودکار" },
    { id: "x5", tenantId: "t2", day: -10, kind: "شارژ", amount: 99_000, credits: 1000, method: "آنلاین", note: "بسته‌ی ۱٬۰۰۰ تایی" },
    { id: "x6", tenantId: "t6", day: -18, kind: "شارژ", amount: 450_000, credits: 5250, method: "آنلاین", note: "بسته‌ی ۵٬۰۰۰ تایی + ۵٪ هدیه" },
    { id: "x7", tenantId: "t3", day: -50, kind: "خرید خط", amount: 3_200_000, credits: 0, method: "آنلاین", note: "خط اختصاصی 50004321 (طلایی)" },
  ];
  const smsPricing: SmsPricing = {
    sell: 95, cost: 52, lineBase: 1_200_000, tierPrices: { "عادی": 0, "رند": 800_000, "طلایی": 2_000_000, "الماس": 6_000_000 },
    packages: [{ id: "p1", count: 1000, price: 99_000, bonusPct: 0 }, { id: "p2", count: 5000, price: 450_000, bonusPct: 5 }, { id: "p3", count: 20000, price: 1_700_000, bonusPct: 10 }, { id: "p4", count: 100000, price: 7_800_000, bonusPct: 20 }],
  };
  return {
    smsAccounts, smsTx, smsLog, smsPricing,
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

// ---------- پیامک ----------
export type SmsLine = { kind: "shared" | "dedicated"; number: string; status: "فعال" | "در انتظار تأیید" | "رد شد"; requestedAt: number; tier?: string; price?: number; kyc?: { holder: string; idNo: string; doc: boolean }; note?: string };
export type SmsAccount = { tenantId: string; balance: number; line: SmsLine; autoRecharge: { on: boolean; threshold: number; packageId: string; source: "wallet" | "online" }; lowAlertSent: boolean; sent30: number; lastTopup: number; optOut: boolean };
export type SmsPackage = { id: string; count: number; price: number; bonusPct: number };
export type SmsTx = { id: string; tenantId: string; day: number; kind: "شارژ" | "هدیه" | "خرید خط" | "ارسال"; amount: number; credits: number; method: string; note: string };
export type SmsMsg = { id: string; tenantId: string; day: number; time: string; customerId: string | null; name: string; phone: string; scenario: string; text: string; parts: number; status: "ارسال‌شده" | "ناموفق" | "در انتظار تأیید" | "مسدود" | "رد شد"; reason?: string; value?: number };
export type SmsPricing = { sell: number; cost: number; packages: SmsPackage[]; lineBase: number; tierPrices: Record<string, number> };

// ---------- نظرسنجی و اعتبار ----------
export type Survey = { id: string; customerId: string | null; name: string; service: string; staff: string; staffId?: string; saleId?: string; rating: number | null; comment: string; day: number; status: "منتظر پاسخ" | "پاسخ داده شد"; route?: "public" | "private"; reply?: string; resolved?: boolean };
export type ReviewCfg = { auto: boolean; threshold: number; googleUrl: string; points: boolean };
// ---------- تولید محتوا ----------
export type Post = { id: string; kind: "before-after" | "service" | "offer" | "birthday" | "tips"; caption: string; tags: string[]; day: number; status: "پیش‌نویس" | "زمان‌بندی‌شده" | "منتشر شد"; before?: string; after?: string; service?: string };
// ---------- آکادمی ----------
export type Lesson = { id: string; title: string; minutes: number; body: string };
export type Course = { id: string; title: string; audience: "مدیر سالن" | "متخصص"; price: number; hours: number; inPlan: string; published: boolean; description: string; lessons: Lesson[] };
export type Enrollment = { id: string; courseId: string; done: string[]; day: number; paid: number };
// ---------- اعلان و پشتیبانی ----------
export type Notification = { id: string; audience: "salon" | "admin"; title: string; body: string; href: string; day: number; read: boolean };
export type TicketMsg = { from: "salon" | "admin"; name: string; text: string; day: number };
export type Ticket = { id: string; subject: string; category: string; priority: "عادی" | "فوری"; status: "باز" | "در حال بررسی" | "بسته"; tenantId: string; messages: TicketMsg[]; day: number };
// ---------- تننت‌ها (سمت ادمین) ----------
export type TStatus = "فعال" | "آزمایشی" | "منقضی‌شده" | "تعلیق";
export type Tenant = { id: string; name: string; owner: string; city: string; phone: string; plan: string; status: TStatus; expiry: string; users: number; customers: number; wallet: number; since: string; notes: string[]; payments: { day: number; amount: number; label: string }[] };
// ---------- مارکت‌پلیس ----------
export type MarketPro = { id: string; name: string; salon: string; city: string; cats: Category[]; rating: number; reviews: number; from: number; bio: string; works: number; tint: [string, string]; services: { name: string; price: number }[] };

export function seedOps() {
  const lorem = (t: string) => `${t}. این درس با مثال‌های عملی سالن و نکات کاربردی همراه است؛ پس از مطالعه، نکته‌ها را در یک مشتری واقعی امتحان کنید و نتیجه را یادداشت کنید.`;
  const L = (t: string[], m = 12): Lesson[] => t.map((x, i) => ({ id: `l${i + 1}`, title: x, minutes: m + i * 2, body: lorem(x) }));
  const courses: Course[] = [
    { id: "c1", title: "قیمت‌گذاری خدمات سالن", audience: "مدیر سالن", price: 0, hours: 2, inPlan: "همه‌ی پلن‌ها", published: true, description: "چطور قیمت هر خدمت را با مواد، زمان و کمیسیون محاسبه کنیم و سود واقعی بسازیم.", lessons: L(["هزینه‌ی واقعی هر خدمت", "محاسبه‌ی حاشیه‌ی سود", "تخفیف بدون ضرر", "بازنگری قیمت‌ها"]) },
    { id: "c2", title: "سیستم بازگشت مشتری و اتوماسیون", audience: "مدیر سالن", price: 690_000, hours: 4, inPlan: "حرفه‌ای و بالاتر", published: true, description: "با چرخه‌ی مراجعه، یادآوری خودکار و کمپین بازگشت، مشتری‌های از دست‌رفته را برگردانید.", lessons: L(["چرخه‌ی مراجعه‌ی مشتری", "قانون‌های اتوماسیون", "کمپین Win-back", "اندازه‌گیری نتیجه"]) },
    { id: "c3", title: "ترندهای بالیاژ ۱۴۰۵", audience: "متخصص", price: 1_200_000, hours: 5, inPlan: "—", published: true, description: "تکنیک‌های روز بالیاژ، رنگ‌بندی پاییزی و نگهداری نتیجه.", lessons: L(["رنگ‌بندی پاییز", "تکنیک دست‌آزاد", "تونینگ و نگهداری", "مشاوره‌ی رنگ به مشتری"]) },
    { id: "c4", title: "فروش محصول بعد از خدمت", audience: "متخصص", price: 0, hours: 1.5, inPlan: "همه‌ی پلن‌ها", published: true, description: "چطور بدون فشار، محصول مراقبتی مناسب را پیشنهاد دهیم.", lessons: L(["زمان‌بندی پیشنهاد", "جمله‌های طلایی", "پاسخ به «گران است»"], 10) },
    { id: "c5", title: "مدیریت پرسنل و پورسانت", audience: "مدیر سالن", price: 890_000, hours: 3, inPlan: "سازمانی", published: false, description: "ساختار پورسانت، KPI و انگیزش تیم.", lessons: L(["ساختار پورسانت", "شاخص‌های عملکرد", "گفتگوی بازخورد"]) },
  ];
  const tenants: Tenant[] = ([
    ["t1", "سالن رُز", "مهسا رحیمی", "تهران", "۰۹۱۲۱۱۱۲۲۳۳", "pro", "فعال", "۲۸ مهر ۱۴۰۵", 6, 1240, 1_180_000, "فروردین ۱۴۰۵"],
    ["t2", "آرایشگاه ماهتاب", "زهرا کاظمی", "اصفهان", "۰۹۱۳۲۲۲۳۳۴۴", "basic", "فعال", "۳ آبان ۱۴۰۵", 3, 410, 640_000, "اردیبهشت ۱۴۰۵"],
    ["t3", "سالن نیلو", "نیلوفر امینی", "شیراز", "۰۹۱۷۳۳۳۴۴۵۵", "elite", "فعال", "۲۰ آذر ۱۴۰۵", 18, 5200, 1_490_000, "اسفند ۱۴۰۴"],
    ["t4", "بیوتی پارسا", "پرستو نادری", "مشهد", "۰۹۱۵۴۴۴۵۵۶۶", "pro", "آزمایشی", "۵ مهر ۱۴۰۵", 2, 96, 90_000, "شهریور ۱۴۰۵"],
    ["t5", "سالن آبان", "مریم صادقی", "تبریز", "۰۹۱۴۵۵۵۶۶۷۷", "basic", "منقضی‌شده", "۲۲ شهریور ۱۴۰۵", 3, 280, 0, "دی ۱۴۰۴"],
    ["t6", "رزا بیوتی", "سمیرا حیدری", "کرج", "۰۹۱۲۶۶۶۷۷۸۸", "pro", "فعال", "۹ مهر ۱۴۰۵", 7, 1510, 320_000, "بهمن ۱۴۰۴"],
    ["t7", "سالن گیسو", "ندا رحمانی", "تهران", "۰۹۳۵۷۷۷۸۸۹۹", "basic", "تعلیق", "۱ شهریور ۱۴۰۵", 2, 150, 0, "مهر ۱۴۰۴"],
  ] as const).map(([id, name, owner, city, phone, plan, status, expiry, users, customers, wallet, since]) => ({
    id, name, owner, city, phone, plan, status, expiry, users, customers, wallet, since, notes: [],
    payments: [-2, -32, -62, -92].map((day, i) => ({ day, amount: plan === "elite" ? 2_900_000 : plan === "pro" ? 1_490_000 : 790_000, label: i === 3 ? "اشتراک — آنلاین" : i === 0 && status === "فعال" ? "اشتراک — کیف پول + آنلاین" : "اشتراک — آنلاین" })).slice(0, status === "آزمایشی" ? 0 : 4),
  }));
  const tickets: Ticket[] = [
    { id: "T-1001", subject: "ارسال پیامک یادآوری انجام نمی‌شود", category: "فنی", priority: "فوری", status: "باز", tenantId: "t2", day: -1, messages: [{ from: "salon", name: "زهرا کاظمی", text: "از دیروز پیامک یادآوری نوبت‌ها ارسال نمی‌شود. لطفاً بررسی کنید.", day: -1 }] },
    { id: "T-1002", subject: "تغییر پلن از حرفه‌ای به سازمانی", category: "مالی", priority: "عادی", status: "در حال بررسی", tenantId: "t6", day: -3, messages: [{ from: "salon", name: "سمیرا حیدری", text: "می‌خواهم پلن را ارتقا بدهم؛ اختلاف مبلغ چقدر می‌شود؟", day: -3 }, { from: "admin", name: "نگین مالی", text: "سلام؛ اختلاف مبلغ برای باقی‌ماندهٔ دوره محاسبه و همین امروز برایتان ارسال می‌شود.", day: -2 }] },
    { id: "T-1003", subject: "آموزش کار با خروجی Excel", category: "آموزش", priority: "عادی", status: "بسته", tenantId: "t3", day: -9, messages: [{ from: "salon", name: "نیلوفر امینی", text: "خروجی گزارش‌ها را از کجا بگیرم؟", day: -9 }, { from: "admin", name: "پشتیبان ۱", text: "از صفحه‌ی گزارش‌ها دکمه‌ی «خروجی Excel کامل». موفق باشید.", day: -9 }] },
  ];
  const surveys: Survey[] = [
    { id: "sv1", customerId: null, name: "دنیا ابراهیمی", service: "رنگ ریشه", staff: "مریم حسینی", staffId: "s1", rating: 5, comment: "عالی بود، دقیقاً همون رنگی که می‌خواستم.", day: -1, status: "پاسخ داده شد", route: "public" },
    { id: "sv2", customerId: null, name: "ژاله فرهادی", service: "فیشال هیدرا", staff: "الهام رضایی", staffId: "s3", rating: 5, comment: "پوستم خیلی روشن شد.", day: -2, status: "پاسخ داده شد", route: "public" },
    { id: "sv3", customerId: null, name: "الناز جعفری", service: "ژل و لاک", staff: "سارا احمدی", staffId: "s4", rating: 2, comment: "کمی معطل شدم و لاک زود پرید.", day: -2, status: "پاسخ داده شد", route: "private", resolved: false },
    { id: "sv4", customerId: null, name: "مهسا کاظمی", service: "کراتین", staff: "نازنین کریمی", staffId: "s2", rating: 4, comment: "خوب بود اما قیمت بالا بود.", day: -4, status: "پاسخ داده شد", route: "public" },
    { id: "sv5", customerId: null, name: "پریسا نوری", service: "بالیاژ", staff: "مریم حسینی", staffId: "s1", rating: 5, comment: "بهترین بالیاژ عمرم!", day: -6, status: "پاسخ داده شد", route: "public" },
    { id: "sv6", customerId: null, name: "نیلوفر صادقی", service: "کراتین", staff: "نازنین کریمی", staffId: "s2", rating: 3, comment: "نتیجه خوب بود ولی بوی مواد اذیت کرد.", day: -8, status: "پاسخ داده شد", route: "private", resolved: true, reply: "ممنون از بازخوردتان؛ برای نوبت بعد از مواد کم‌بو استفاده می‌کنیم." },
  ];
  const posts: Post[] = [
    { id: "p1", kind: "service", caption: "✨ کراتین فوق‌العاده با دست نازنین! برای رزرو نوبت به لینک پروفایل سر بزن.", tags: ["#کراتین", "#سالن_زیبایی"], day: -3, status: "منتشر شد", service: "کراتین" },
    { id: "p2", kind: "offer", caption: "🌸 هفته‌ی مراقبت از مو: ۱۰٪ تخفیف روی همه‌ی خدمات مو.", tags: ["#تخفیف", "#مو"], day: 2, status: "زمان‌بندی‌شده" },
  ];
  const market: MarketPro[] = [
    { id: "m1", name: "آیدا مرادی", salon: "استودیو آیدا", city: "تهران", cats: ["مو"], rating: 4.9, reviews: 212, from: 900_000, bio: "متخصص رنگ و بالیاژ با ۱۰ سال سابقه.", works: 84, tint: ["#f7e4ea", "#f6ecd6"], services: [{ name: "بالیاژ", price: 4_800_000 }, { name: "رنگ ریشه", price: 1_900_000 }] },
    { id: "m2", name: "لیلا صمدی", salon: "سالن لیلا", city: "تهران", cats: ["پوست"], rating: 4.8, reviews: 143, from: 1_100_000, bio: "متخصص پوست و لیزر، مشاور مراقبت‌های خانگی.", works: 51, tint: ["#e0f0e8", "#f6ecd6"], services: [{ name: "فیشال", price: 2_000_000 }, { name: "پاکسازی", price: 1_200_000 }] },
    { id: "m3", name: "سحر نیک‌پی", salon: "نیل‌آرت سحر", city: "اصفهان", cats: ["ناخن"], rating: 4.7, reviews: 96, from: 450_000, bio: "طراحی ناخن و ژل، نمونه‌کارهای متنوع.", works: 130, tint: ["#e1edf8", "#f7e4ea"], services: [{ name: "ژل و لاک", price: 900_000 }, { name: "طراحی ناخن", price: 600_000 }] },
    { id: "m4", name: "مینا کاشانی", salon: "بیوتی مینا", city: "شیراز", cats: ["مو", "آرایش"], rating: 4.6, reviews: 78, from: 650_000, bio: "کوتاهی مدرن و میکاپ مجلسی.", works: 60, tint: ["#f6ecd6", "#e1edf8"], services: [{ name: "کوتاهی", price: 700_000 }, { name: "میکاپ", price: 2_800_000 }] },
    { id: "m5", name: "نگار رستمی", salon: "سالن نگار", city: "کرج", cats: ["مو"], rating: 4.8, reviews: 120, from: 700_000, bio: "کراتین و احیای موی آسیب‌دیده.", works: 45, tint: ["#f7e4ea", "#e0f0e8"], services: [{ name: "کراتین", price: 3_900_000 }, { name: "پروتئین‌تراپی", price: 2_500_000 }] },
    { id: "m6", name: "هستی عباسی", salon: "هستی بیوتی", city: "مشهد", cats: ["پوست", "آرایش"], rating: 4.5, reviews: 64, from: 800_000, bio: "فیشال و لمینت مژه.", works: 38, tint: ["#e0f0e8", "#f7e4ea"], services: [{ name: "فیشال", price: 1_800_000 }, { name: "لمینت مژه", price: 1_600_000 }] },
  ];
  return {
    surveys, reviewCfg: { auto: true, threshold: 4, googleUrl: "https://maps.app.goo.gl/salon-rose", points: true } as ReviewCfg,
    posts, courses, enrollments: [] as Enrollment[], notifications: [
      { id: "n1", audience: "salon", title: "نوبت جدید آنلاین", body: "دنیا ابراهیمی برای رنگ ریشه نوبت گرفت", href: "/calendar", day: 0, read: false },
      { id: "n2", audience: "salon", title: "بازخورد منفی", body: "الناز جعفری امتیاز ۲ داد؛ لطفاً پیگیری کنید", href: "/reviews", day: -2, read: false },
      { id: "n3", audience: "admin", title: "تیکت فوری", body: "آرایشگاه ماهتاب: ارسال پیامک یادآوری انجام نمی‌شود", href: "/admin/tickets", day: -1, read: false },
      { id: "n4", audience: "admin", title: "پورسانت آماده شارژ", body: "۲ سفارش مهلت مرجوعی را گذرانده‌اند", href: "/admin/commissions", day: 0, read: false },
    ] as Notification[], tickets, tenants, market,
  };
}
