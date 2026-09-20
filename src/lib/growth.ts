import { commit, getDB, type Customer, type DB } from "./db";
import type { AutoKind, AutoRule, Campaign, GiftCard, Loyalty, MembershipPlan, ReferralCfg, Segment } from "./seed-extra";
import { dayInfo } from "./dates";
import { uid } from "./factories";
import { sales } from "./sales";
import { withPoints } from "./loyalty";
import { NOW_MIN } from "./mock";
import type { PayMethod } from "./seed-extra";

/** نام ماه شمسیِ امروز، برای تشخیص تولدهای این ماه */
export const thisMonth = () => dayInfo(0).short.split(" ").at(-1) ?? "";

export function audience(d: DB, s: Segment): Customer[] {
  return d.customers.filter((c) =>
    (s.inactiveDays === undefined || c.lastVisitDays >= s.inactiveDays) &&
    (!s.tiers?.length || s.tiers.includes(c.tier)) &&
    (!s.birthdayMonth || c.birth.includes(thisMonth())) &&
    (s.minSpend === undefined || c.total >= s.minSpend) &&
    (!s.favService || c.favService === s.favService));
}

export type AutoMeta = { label: string; unit: string; when: (days: number) => string; promo: boolean; trigger: string; needsDays: boolean; event?: boolean };
export const autoMeta: Record<AutoKind, AutoMeta> = {
  reminder24: { label: "یادآوری نوبت (۲۴ ساعت قبل)", unit: "", when: () => "فردا نوبت دارد", promo: false, trigger: "خودکار قبل از نوبت", needsDays: false },
  reminder2: { label: "یادآوری نوبت (۲ ساعت قبل)", unit: "", when: () => "تا ۲ ساعت دیگر نوبت دارد", promo: false, trigger: "خودکار قبل از نوبت", needsDays: false },
  confirm: { label: "تأیید ثبت نوبت", unit: "", when: () => "نوبتی برایش ثبت شد", promo: false, trigger: "لحظه‌ی ثبت نوبت", needsDays: false, event: true },
  thanks: { label: "تشکر بعد از خدمت", unit: "", when: () => "امروز خدمت گرفته است", promo: false, trigger: "بعد از فاکتور", needsDays: false, event: true },
  inactive: { label: "مراجعه نکرده", unit: "روز بعد از آخرین مراجعه", when: (n) => `${n} روز از آخرین مراجعه گذشته`, promo: true, trigger: "غیبت مشتری", needsDays: true },
  cycle: { label: "زمان سرویس بعدی", unit: "روز مانده به چرخه‌ی معمول مشتری", when: (n) => `حداکثر ${n} روز به چرخه‌ی معمول مانده`, promo: true, trigger: "چرخه‌ی مراجعه", needsDays: true },
  afterPurchase: { label: "پیشنهاد محصول بعد از خرید", unit: "روز اخیر", when: (n) => `در ${n} روز اخیر محصول خریده`, promo: true, trigger: "بعد از خرید محصول", needsDays: true },
  birthday: { label: "تبریک تولد", unit: "", when: () => "تولدش در این ماه است", promo: true, trigger: "تاریخ تولد", needsDays: false },
  winback: { label: "غیبت طولانی (بازگشت ویژه)", unit: "روز بدون مراجعه", when: (n) => `${n} روز بدون مراجعه`, promo: true, trigger: "غیبت طولانی", needsDays: true },
  capacity: { label: "پر کردن ظرفیت خالی فردا", unit: "", when: () => "فردا ظرفیت خالی است و مشتری وقتش رسیده", promo: true, trigger: "ظرفیت خالی", needsDays: false },
  debt: { label: "یادآوری بدهی", unit: "", when: () => "بدهی پرداخت‌نشده دارد", promo: false, trigger: "بدهی مشتری", needsDays: false },
  welcome: { label: "خوشامدگویی مشتری جدید", unit: "", when: () => "به‌تازگی ثبت‌نام کرده", promo: false, trigger: "ثبت‌نام آنلاین", needsDays: false },
  expiry: { label: "انقضای عضویت", unit: "روز مانده به پایان", when: (n) => `عضویتش تا ${n} روز دیگر تمام می‌شود`, promo: false, trigger: "پایان عضویت", needsDays: true },
};

export type Target = { c: Customer; vars: Record<string, string> };
export function matching(d: DB, r: AutoRule): Target[] {
  const t = (c: Customer, vars: Record<string, string> = {}): Target => ({ c, vars });
  const byId = (id?: string) => d.customers.find((c) => c.id === id);
  switch (r.kind) {
    case "inactive": case "winback": return d.customers.filter((c) => c.lastVisitDays >= r.days && c.visits > 0).map((c) => t(c));
    case "cycle": return d.customers.filter((c) => c.cycleDays > 0 && c.cycleDays - c.lastVisitDays <= r.days && c.cycleDays - c.lastVisitDays >= 0).map((c) => t(c));
    case "afterPurchase": { const ids = new Set(d.sales.filter((s) => s.status !== "باطل" && s.day >= -r.days && s.customerId && s.lines.some((l) => l.kind === "product")).map((s) => s.customerId!)); return d.customers.filter((c) => ids.has(c.id)).map((c) => t(c)); }
    case "birthday": return d.customers.filter((c) => c.birth.includes(thisMonth())).map((c) => t(c));
    case "reminder24": return d.appts.filter((a) => a.day === 1 && a.status !== "done" && byId(a.customerId)).map((a) => t(byId(a.customerId)!, { service: a.service, time: clockText(a.start) }));
    case "reminder2": return d.appts.filter((a) => a.day === 0 && a.status !== "done" && a.start > NOW_MIN && a.start - NOW_MIN <= 120 && byId(a.customerId)).map((a) => t(byId(a.customerId)!, { service: a.service, time: clockText(a.start) }));
    case "thanks": { const ids = new Set(d.sales.filter((s) => s.day === 0 && s.status !== "باطل" && s.customerId && s.lines.some((l) => l.kind === "service")).map((s) => s.customerId!)); return d.customers.filter((c) => ids.has(c.id)).map((c) => t(c)); }
    case "capacity": { const ws = d.customers.filter((c) => c.visits > 0 && (c.lastVisitDays >= 30 || (c.cycleDays > 0 && c.cycleDays - c.lastVisitDays <= 7))); return ws.slice(0, 15).map((c) => t(c)); }
    case "debt": return d.customers.filter((c) => c.debt > 0).map((c) => t(c, { debt: c.debt.toLocaleString("en-US").replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[+x]).replace(/,/g, "٬") }));
    case "welcome": return d.customers.filter((c) => c.visits <= 1 && c.tags.some((x) => x.includes("آنلاین") || x === "جدید")).map((c) => t(c));
    case "expiry": return d.memberships.filter((m) => m.status === "فعال" && m.expiry <= r.days).map((m) => byId(m.customerId)).filter(Boolean).map((c) => t(c!, { days: String(r.days).replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[+x]) }));
    case "confirm": return [];
  }
}
const clockText = (m: number) => `${String(9 + Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`.replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[+x]);

const patch = (fn: (d: DB) => Partial<DB>) => { const d = getDB(); commit({ ...d, ...fn(d) }); };

export const growth = {
  saveLoyalty(l: Loyalty) { patch(() => ({ loyalty: l })); },
  adjustPoints(customerId: string, delta: number, note: string) { patch((d) => ({ customers: d.customers.map((c) => (c.id === customerId ? withPoints(d, c, delta, note || "تنظیم دستی") : c)) })); },
  saveReferral(r: ReferralCfg) { patch(() => ({ referral: r })); },

  deleteCampaign(id: string) { patch((d) => ({ campaigns: d.campaigns.filter((c) => c.id !== id) })); },

  saveRule(r: AutoRule) { patch((d) => ({ automations: d.automations.some((x) => x.id === r.id) ? d.automations.map((x) => (x.id === r.id ? r : x)) : [...d.automations, r] })); },
  deleteRule(id: string) { patch((d) => ({ automations: d.automations.filter((x) => x.id !== id) })); },

  savePlan(p: MembershipPlan) { patch((d) => ({ memPlans: d.memPlans.some((x) => x.id === p.id) ? d.memPlans.map((x) => (x.id === p.id ? p : x)) : [...d.memPlans, p] })); },
  deletePlan(id: string) { patch((d) => ({ memPlans: d.memPlans.filter((x) => x.id !== id) })); },
  /** فروش عضویت: فاکتور صندوق + اشتراک مشتری با اعتبار جلسه */
  sellMembership(customerId: string, planId: string, method: PayMethod): { ok: boolean; msg: string } {
    const d = getDB();
    const c = d.customers.find((x) => x.id === customerId), p = d.memPlans.find((x) => x.id === planId);
    if (!c || !p) return { ok: false, msg: "مشتری یا پلن پیدا نشد." };
    if (sales.isClosed(d, 0)) return { ok: false, msg: "روز جاری بسته شده است." };
    if (method === "کیف پول" && c.wallet < p.price) return { ok: false, msg: "موجودی کیف پول مشتری کافی نیست." };
    sales.createSale({ customerId, customerName: c.name, lines: [{ kind: "membership", refId: p.id, name: p.name, qty: 1, price: p.price }], discountPct: 0, pays: [{ method, amount: p.price }] });
    const d2 = getDB();
    commit({ ...d2, memberships: [{ id: uid("m"), customerId, planId, start: 0, expiry: p.months * 30, credits: p.credits, status: "فعال" }, ...d2.memberships] });
    return { ok: true, msg: `عضویت «${p.name}» برای ${c.name} فعال شد.` };
  },
  useCredit(id: string) { patch((d) => ({ memberships: d.memberships.map((m) => (m.id === id && m.credits > 0 ? { ...m, credits: m.credits - 1 } : m)) })); },

  /** صدور کارت هدیه: کد یکتا + فاکتور صندوق */
  issueGift(g: { buyerId: string | null; fromName: string; toName: string; toPhone: string; occasion: string; message: string; amount: number; method: PayMethod }): { ok: boolean; msg: string; code?: string } {
    const d = getDB();
    if (sales.isClosed(d, 0)) return { ok: false, msg: "روز جاری بسته شده است." };
    const buyer = g.buyerId ? d.customers.find((c) => c.id === g.buyerId) : undefined;
    if (g.method === "کیف پول" && (!buyer || buyer.wallet < g.amount)) return { ok: false, msg: "موجودی کیف پول خریدار کافی نیست." };
    const rnd = () => String(Math.floor(1000 + Math.random() * 9000));
    let code = `GC-${rnd()}-${rnd()}`;
    while (d.giftCards.some((x) => x.code === code)) code = `GC-${rnd()}-${rnd()}`;
    sales.createSale({ customerId: g.buyerId, customerName: g.fromName, lines: [{ kind: "membership", refId: code, name: `کارت هدیه ${code}`, qty: 1, price: g.amount }], discountPct: 0, pays: [{ method: g.method, amount: g.amount }] });
    const card: GiftCard = { id: uid("g"), code, amount: g.amount, balance: g.amount, fromName: g.fromName, toName: g.toName, toPhone: g.toPhone, occasion: g.occasion, message: g.message, day: 0, status: "فعال" };
    const d2 = getDB();
    commit({ ...d2, giftCards: [card, ...d2.giftCards] });
    return { ok: true, msg: "کارت هدیه صادر شد.", code };
  },
  voidGift(id: string) { patch((d) => ({ giftCards: d.giftCards.map((x) => (x.id === id && x.status === "فعال" && x.balance === x.amount ? { ...x, status: "باطل", balance: 0 } : x)) })); },
};
export type { Campaign };
