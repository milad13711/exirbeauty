import { commit, getDB, TODAY_SHORT, type Customer, type DB } from "./db";
import type { AutoKind, AutoRule, Campaign, GiftCard, Loyalty, MembershipPlan, ReferralCfg, Segment } from "./seed-extra";
import { dayInfo } from "./dates";
import { uid } from "./factories";
import { sales, withPoints } from "./sales";
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

export const autoMeta: Record<AutoKind, { label: string; unit: string; when: (days: number) => string }> = {
  inactive: { label: "مراجعه نکرده", unit: "روز بعد از آخرین مراجعه", when: (n) => `${n} روز از آخرین مراجعه گذشته` },
  cycle: { label: "زمان سرویس بعدی", unit: "روز مانده به چرخه‌ی معمول مشتری", when: (n) => `حداکثر ${n} روز به چرخه‌ی معمول مانده` },
  afterPurchase: { label: "پس از خرید محصول", unit: "روز اخیر", when: (n) => `در ${n} روز اخیر محصول خریده` },
  birthday: { label: "تولد", unit: "(ماه تولد)", when: () => "تولدش در این ماه است" },
  winback: { label: "غیبت طولانی", unit: "روز بدون مراجعه", when: (n) => `${n} روز بدون مراجعه` },
};

export function matching(d: DB, r: AutoRule): Customer[] {
  switch (r.kind) {
    case "inactive": case "winback": return d.customers.filter((c) => c.lastVisitDays >= r.days && c.visits > 0);
    case "cycle": return d.customers.filter((c) => c.cycleDays > 0 && c.cycleDays - c.lastVisitDays <= r.days && c.cycleDays - c.lastVisitDays >= 0);
    case "afterPurchase": { const ids = new Set(d.sales.filter((s) => s.status !== "باطل" && s.day >= -r.days && s.customerId && s.lines.some((l) => l.kind === "product")).map((s) => s.customerId!)); return d.customers.filter((c) => ids.has(c.id)); }
    case "birthday": return d.customers.filter((c) => c.birth.includes(thisMonth()));
  }
}

const patch = (fn: (d: DB) => Partial<DB>) => { const d = getDB(); commit({ ...d, ...fn(d) }); };

export const growth = {
  saveLoyalty(l: Loyalty) { patch(() => ({ loyalty: l })); },
  adjustPoints(customerId: string, delta: number, note: string) { patch((d) => ({ customers: d.customers.map((c) => (c.id === customerId ? withPoints(d, c, delta, note || "تنظیم دستی") : c)) })); },
  saveReferral(r: ReferralCfg) { patch(() => ({ referral: r })); },

  sendCampaign(c: Omit<Campaign, "id" | "day" | "count" | "ids" | "status"> & { whenDay?: number }): Campaign {
    const d = getDB();
    const ids = audience(d, c.segment).map((x) => x.id);
    const camp: Campaign = { ...c, id: uid("cp"), day: 0, count: ids.length, ids, status: c.whenDay && c.whenDay > 0 ? "زمان‌بندی‌شده" : "ارسال‌شده" };
    commit({ ...d, campaigns: [camp, ...d.campaigns] });
    return camp;
  },
  deleteCampaign(id: string) { patch((d) => ({ campaigns: d.campaigns.filter((c) => c.id !== id) })); },

  saveRule(r: AutoRule) { patch((d) => ({ automations: d.automations.some((x) => x.id === r.id) ? d.automations.map((x) => (x.id === r.id ? r : x)) : [...d.automations, r] })); },
  deleteRule(id: string) { patch((d) => ({ automations: d.automations.filter((x) => x.id !== id) })); },
  /** اجرای دستی: پیام برای مشمولان «ارسال» می‌شود و شمارنده‌ها به‌روز می‌شوند */
  runRule(id: string): number { const d = getDB(); const r = d.automations.find((x) => x.id === id); if (!r) return 0; const n = matching(d, r).length; commit({ ...d, automations: d.automations.map((x) => (x.id === id ? { ...x, sent: x.sent + n } : x)) }); return n; },

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
    return { ok: true, msg: `کارت هدیه صادر شد.`, code };
  },
  voidGift(id: string) { patch((d) => ({ giftCards: d.giftCards.map((x) => (x.id === id && x.status === "فعال" && x.balance === x.amount ? { ...x, status: "باطل", balance: 0 } : x)) })); },
};
export { TODAY_SHORT };
