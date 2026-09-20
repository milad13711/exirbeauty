import { commit, getDB, type Customer, type DB } from "./db";
import type { AutoRule, Campaign, Segment, SmsAccount, SmsMsg, SmsPackage, SmsPricing, SmsTx } from "./seed-extra";
import { audience, autoMeta, matching, type Target } from "./growth";
import { NOW_MIN } from "./mock";
import { ops } from "./ops";
import { uid } from "./factories";
import { moduleActive } from "./modules";
import { fa, num, toman } from "./fa";

export const SMS_TENANT = "t1";
const NOW_HOUR = 9 + NOW_MIN / 60;
export const myAccount = (d: DB): SmsAccount => d.smsAccounts.find((a) => a.tenantId === SMS_TENANT)!;
export const smsActive = (d: DB) => moduleActive(d, "sms");

/** پیامک فارسی (یونیکد): بخش اول ۷۰ کاراکتر، بخش‌های بعدی ۶۷ */
export const parts = (t: string) => { const n = [...t].length; return n <= 70 ? 1 : Math.ceil(n / 67); };
export const render = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
export const OPT_OUT = "\nلغو۱۱";
export const packageCredits = (p: SmsPackage) => Math.round(p.count * (1 + p.bonusPct / 100));
export const perSms = (p: SmsPackage) => Math.round(p.price / packageCredits(p));

// ---------- شماره‌ی اختصاصی ----------
export function tierOf(n: string): string {
  const last = n.slice(-6);
  if (/^(\d)\1{5}$/.test(last)) return "الماس";
  if (/(\d)\1{3}$/.test(last) || last === "123456" || last === "654321" || /^(\d)(\d)\1\2\1\2$/.test(last) || last === [...last].reverse().join("")) return "طلایی";
  if (/(\d)\1{2}$/.test(last) || /00$/.test(last) || /(\d\d)\1$/.test(last)) return "رند";
  return "عادی";
}
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function searchNumbers(q: string, pr: SmsPricing) {
  const dg = q.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).slice(0, 6);
  if (dg.length < 2) return [];
  const filler = (k: number, seed: string) => String(h(seed + dg)).padStart(8, "3").slice(0, k);
  const need = 6 - dg.length;
  const cands = [
    `5000${filler(need, "e")}${dg}`, `5000${dg}${filler(need, "s")}`, `5000${(dg.repeat(3)).slice(0, 6)}`,
    `5000${dg}${"0".repeat(need)}`, `5000${(dg + [...dg].reverse().join("")).padEnd(6, "0").slice(0, 6)}`, `5000${filler(need, "z")}${dg}`,
  ];
  return [...new Set(cands)].map((n) => { const tier = tierOf(n); return { number: n, tier, price: pr.lineBase + (pr.tierPrices[tier] ?? 0), available: h(n) % 5 !== 0 }; });
}

// ---------- آمار و بازده ----------
export function stats(d: DB, days = 30) {
  const msgs = d.smsLog.filter((m) => m.tenantId === SMS_TENANT && m.day >= -(days - 1) && (m.status === "ارسال‌شده" || m.status === "ناموفق"));
  const ok = msgs.filter((m) => m.status === "ارسال‌شده");
  const used = new Set<string>();
  const by: Record<string, { sent: number; converted: number; attr: number }> = {};
  for (const m of [...ok].sort((a, b) => a.day - b.day)) {
    const e = (by[m.scenario] ??= { sent: 0, converted: 0, attr: 0 });
    e.sent++;
    if (!m.customerId) continue;
    // فقط پیام‌های تبلیغاتی و کمپین؛ یادآوری/تشکر/تأیید «عملیاتی» است و فروش به آن‌ها نسبت داده نمی‌شود
    if (!(autoMeta as Record<string, { promo: boolean }>)[m.scenario]?.promo && m.scenario !== "campaign") continue;
    const s = d.sales.find((x) => !used.has(x.id) && x.customerId === m.customerId && x.status !== "باطل" && x.day >= m.day && x.day <= m.day + 5);
    if (s) { used.add(s.id); e.converted++; e.attr += s.total; }
  }
  const revenue = Object.values(by).reduce((a, x) => a + x.attr, 0);
  const credits = msgs.reduce((a, m) => a + m.parts, 0);
  return { sent: ok.length, all: msgs.length, credits, delivery: msgs.length ? ok.length / msgs.length : 1, revenue, byScenario: by, perSms: ok.length ? Math.round(revenue / ok.length) : 0 };
}
/** میانگین مصرف روزانه در ۱۴ روز اخیر و پیش‌بینی روزهای باقی‌مانده */
export function usage(d: DB) {
  const recent = d.smsLog.filter((m) => m.tenantId === SMS_TENANT && m.day >= -13 && m.status !== "رد شد" && m.status !== "مسدود" && m.status !== "در انتظار تأیید").reduce((a, m) => a + m.parts, 0);
  const daily = Math.max(1, recent / 14);
  const acc = myAccount(d);
  const need30 = Math.ceil(daily * 30 * 1.5); // با ضریب اطمینان برای اوج‌های فصلی
  const pk = [...d.smsPricing.packages].sort((a, b) => a.count - b.count);
  const rec = pk.find((p) => packageCredits(p) >= Math.max(1, need30 - acc.balance)) ?? pk[pk.length - 1];
  return { daily, need30, daysLeft: Math.floor(acc.balance / daily), recommended: rec };
}

// ---------- ارسال ----------
type Draft = { customerId: string | null; name: string; phone: string; text: string };
type Summary = { sent: number; queued: number; blocked: number; capped: number; deferred: number; credits: number; blockedValue: number };
const emptySum = (): Summary => ({ sent: 0, queued: 0, blocked: 0, capped: 0, deferred: 0, credits: 0, blockedValue: 0 });

function deliver(d: DB, drafts: Draft[], scenario: string, rule?: AutoRule): { d: DB; sum: Summary } {
  const acc = myAccount(d);
  const sum = emptySum();
  if (rule && !(NOW_HOUR >= rule.window[0] && NOW_HOUR < rule.window[1])) { sum.deferred = drafts.length; return { d, sum }; }
  const st = stats(d);
  const est = st.perSms || 35_000; // ارزش تقریبی هر پیامک برای پیام‌های مسدودشده
  let bal = acc.balance;
  const logs: SmsMsg[] = [];
  const today = d.smsLog.filter((m) => m.scenario === scenario && m.day === 0 && m.status !== "رد شد" && m.status !== "مسدود").length;
  for (const dr of drafts) {
    const cnt = [...logs, ...d.smsLog].filter((m) => m.customerId === dr.customerId && dr.customerId && m.scenario === scenario && m.day >= -29 && (m.status === "ارسال‌شده" || m.status === "ناموفق" || m.status === "در انتظار تأیید")).length;
    if (rule && cnt >= rule.perCustomer30) { sum.capped++; continue; }
    if (rule && today + sum.sent + sum.queued >= rule.dailyCap) { sum.capped++; continue; }
    const p = parts(dr.text);
    const base = { id: uid("sm"), tenantId: SMS_TENANT, day: 0, time: "۱۴:۲۰", customerId: dr.customerId, name: dr.name, phone: dr.phone, scenario, text: dr.text, parts: p };
    if (rule?.approval) { logs.push({ ...base, status: "در انتظار تأیید" }); sum.queued++; continue; }
    if (bal < p) { logs.push({ ...base, status: "مسدود", reason: "اعتبار کافی نیست", value: est }); sum.blocked++; sum.blockedValue += est; continue; }
    bal -= p; sum.credits += p;
    const fail = (h(dr.phone) + logs.length) % 25 === 0;
    logs.push({ ...base, status: fail ? "ناموفق" : "ارسال‌شده", reason: fail ? "گوشی خاموش/خارج از دسترس" : undefined }); sum.sent++;
  }
  const label = rule ? autoMeta[rule.kind].label : scenario === "campaign" ? "کمپین" : scenario;
  const tx: SmsTx[] = sum.credits ? [{ id: uid("x"), tenantId: SMS_TENANT, day: 0, kind: "ارسال", amount: 0, credits: -sum.credits, method: "—", note: `${label}: ${fa(sum.sent)} پیام` }, ...d.smsTx] : d.smsTx;
  return { d: { ...d, smsLog: [...logs, ...d.smsLog], smsTx: tx, smsAccounts: d.smsAccounts.map((a) => (a.tenantId === SMS_TENANT ? { ...a, balance: bal, sent30: a.sent30 + sum.sent } : a)) }, sum };
}

/** بعد از هر مصرف: شارژ خودکار یا هشدار کم‌بودن اعتبار (به سالن و به ادمین برای پیگیری فروش) */
function check() {
  let d = getDB(); const a = myAccount(d);
  if (a.balance > a.autoRecharge.threshold) { if (a.lowAlertSent) commit({ ...d, smsAccounts: d.smsAccounts.map((x) => (x.tenantId === SMS_TENANT ? { ...x, lowAlertSent: false } : x)) }); return; }
  if (a.autoRecharge.on) {
    const r = applyTopup(d, a.autoRecharge.packageId, a.autoRecharge.source, "شارژ خودکار");
    if (r.ok) { commit(r.d); ops.notify("salon", "شارژ خودکار پیامک", r.msg, "/sms"); ops.notify("admin", "شارژ خودکار پیامک", `${d.salon.name}: ${r.msg}`, "/admin/sms"); return; }
  }
  if (!a.lowAlertSent) {
    d = getDB(); commit({ ...d, smsAccounts: d.smsAccounts.map((x) => (x.tenantId === SMS_TENANT ? { ...x, lowAlertSent: true } : x)) });
    ops.notify("salon", "اعتبار پیامک رو به پایان است", `فقط ${fa(a.balance)} پیامک باقی مانده؛ سناریوهای خودکار ممکن است متوقف شوند.`, "/sms");
    ops.notify("admin", "اعتبار پیامک کم شد", `${d.salon.name}: ${fa(a.balance)} پیامک — فرصت پیگیری فروش شارژ`, "/admin/sms");
  }
}

function applyTopup(d: DB, pkgId: string, method: "online" | "wallet", note = ""): { d: DB; ok: boolean; msg: string } {
  const p = d.smsPricing.packages.find((x) => x.id === pkgId);
  if (!p) return { d, ok: false, msg: "بسته پیدا نشد." };
  const wallet = d.wallets.s1 ?? 0;
  if (method === "wallet" && wallet < p.price) return { d, ok: false, msg: `کیف پول (${toman(wallet)}) برای این بسته کافی نیست.` };
  const credits = packageCredits(p);
  const tx: SmsTx = { id: uid("x"), tenantId: SMS_TENANT, day: 0, kind: "شارژ", amount: p.price, credits, method: method === "wallet" ? "کیف پول پورسانت" : "آنلاین", note: note || `بسته‌ی ${fa(p.count)} تایی${p.bonusPct ? ` + ${fa(p.bonusPct)}٪ هدیه` : ""}` };
  return {
    ok: true, msg: `${num(credits)} پیامک به اعتبار شما اضافه شد (${toman(p.price)}).`,
    d: { ...d, wallets: method === "wallet" ? { ...d.wallets, s1: wallet - p.price } : d.wallets, smsTx: [tx, ...d.smsTx], smsAccounts: d.smsAccounts.map((a) => (a.tenantId === SMS_TENANT ? { ...a, balance: a.balance + credits, lastTopup: 0, lowAlertSent: false } : a)) },
  };
}

const firstName = (c: Customer) => c.name.split(" ")[0];
function draftFor(d: DB, rule: AutoRule, t: Target): Draft {
  const vars = { name: firstName(t.c), salon: d.salon.name, link: "exirbeauty.ir/book", gift: rule.gift, ...t.vars };
  let text = render(rule.message, vars);
  if (autoMeta[rule.kind].promo && myAccount(d).optOut) text += OPT_OUT;
  return { customerId: t.c.id, name: t.c.name, phone: t.c.phone, text };
}
export const preview = (d: DB, rule: AutoRule, t?: Target) => { const tg = t ?? matching(d, rule)[0]; return tg ? draftFor(d, rule, tg).text : render(rule.message, { name: "سارا", salon: d.salon.name, link: "exirbeauty.ir/book", gift: rule.gift, time: "۱۷:۳۰", service: "رنگ ریشه", debt: "۸۵۰٬۰۰۰", days: "۷" }); };

export const sms = {
  /** اجرای یک سناریو روی مشمولان فعلی */
  runRule(id: string): Summary {
    const d = getDB(); const r = d.automations.find((x) => x.id === id);
    if (!r || !smsActive(d)) return emptySum();
    const res = deliver(d, matching(d, r).map((t) => draftFor(d, r, t)), r.id.startsWith("au") ? r.kind : r.id, r);
    commit({ ...res.d, automations: res.d.automations.map((x) => (x.id === id ? { ...x, sent: x.sent + res.sum.sent } : x)) });
    check(); return res.sum;
  },
  runAll(): Summary & { rules: number } {
    let total = { ...emptySum(), rules: 0 };
    for (const r of getDB().automations.filter((x) => x.on && !autoMeta[x.kind].event || (x.on && x.kind === "thanks"))) {
      const s = sms.runRule(r.id); total.rules++;
      total = { ...total, sent: total.sent + s.sent, queued: total.queued + s.queued, blocked: total.blocked + s.blocked, capped: total.capped + s.capped, deferred: total.deferred + s.deferred, credits: total.credits + s.credits, blockedValue: total.blockedValue + s.blockedValue };
    }
    return total;
  },
  /** رویداد لحظه‌ای (تأیید نوبت، تشکر بعد از خدمت) */
  event(kind: "confirm" | "thanks", customerId: string | null, vars: Record<string, string> = {}) {
    const d = getDB(); if (!smsActive(d) || !customerId) return;
    const r = d.automations.find((x) => x.kind === kind && x.on); const c = d.customers.find((x) => x.id === customerId);
    if (!r || !c) return;
    const res = deliver(d, [draftFor(d, r, { c, vars })], r.kind, r);
    commit({ ...res.d, automations: res.d.automations.map((x) => (x.id === r.id ? { ...x, sent: x.sent + res.sum.sent } : x)) });
    check();
  },
  /** کمپین: هزینه از اعتبار کسر می‌شود؛ اگر اعتبار کم باشد فقط تا سقف اعتبار ارسال می‌شود */
  campaign(c: { name: string; channel: string; message: string; segment: Segment; whenDay?: number }): { campaign: Campaign; sum: Summary; total: number } {
    const d = getDB();
    const aud = audience(d, c.segment);
    const drafts: Draft[] = aud.map((x) => ({ customerId: x.id, name: x.name, phone: x.phone, text: render(c.message, { name: firstName(x), salon: d.salon.name, link: "exirbeauty.ir/book" }) + (myAccount(d).optOut ? OPT_OUT : "") }));
    const res = c.whenDay && c.whenDay > 0 ? { d, sum: emptySum() } : deliver(d, drafts, "campaign");
    const sentIds = res.d.smsLog.filter((m) => m.scenario === "campaign" && m.day === 0 && m.status === "ارسال‌شده" && !d.smsLog.some((o) => o.id === m.id)).map((m) => m.customerId!).filter(Boolean);
    const camp: Campaign = { id: uid("cp"), name: c.name, day: 0, channel: c.channel, message: c.message, segment: c.segment, count: c.whenDay ? aud.length : res.sum.sent, ids: c.whenDay ? aud.map((x) => x.id) : sentIds, status: c.whenDay && c.whenDay > 0 ? "زمان‌بندی‌شده" : "ارسال‌شده", whenDay: c.whenDay };
    commit({ ...res.d, campaigns: [camp, ...res.d.campaigns] });
    check(); return { campaign: camp, sum: res.sum, total: aud.length };
  },
  /** هزینه‌ی تخمینی ارسال کمپین (پیامک) */
  campaignCost(d: DB, c: { message: string; segment: Segment }) { const aud = audience(d, c.segment); const each = parts(render(c.message, { name: "سارا", salon: d.salon.name, link: "exirbeauty.ir/book" }) + (myAccount(d).optOut ? OPT_OUT : "")); return { count: aud.length, credits: aud.length * each, each }; },

  approve(id: string) {
    const d = getDB(); const m = d.smsLog.find((x) => x.id === id); const a = myAccount(d);
    if (!m || m.status !== "در انتظار تأیید") return { ok: false };
    if (a.balance < m.parts) { commit({ ...d, smsLog: d.smsLog.map((x) => (x.id === id ? { ...x, status: "مسدود", reason: "اعتبار کافی نیست" } : x)) }); return { ok: false }; }
    commit({ ...d, smsLog: d.smsLog.map((x) => (x.id === id ? { ...x, status: "ارسال‌شده", reason: undefined } : x)), smsAccounts: d.smsAccounts.map((x) => (x.tenantId === SMS_TENANT ? { ...x, balance: x.balance - m.parts, sent30: x.sent30 + 1 } : x)), smsTx: [{ id: uid("x"), tenantId: SMS_TENANT, day: 0, kind: "ارسال", amount: 0, credits: -m.parts, method: "—", note: "ارسال پس از تأیید" }, ...d.smsTx] });
    check(); return { ok: true };
  },
  approveAll() { const q = getDB().smsLog.filter((m) => m.status === "در انتظار تأیید"); let n = 0; q.forEach((m) => { if (sms.approve(m.id).ok) n++; }); return n; },
  reject(id: string) { const d = getDB(); commit({ ...d, smsLog: d.smsLog.map((x) => (x.id === id && x.status === "در انتظار تأیید" ? { ...x, status: "رد شد" } : x)) }); },

  topup(pkgId: string, method: "online" | "wallet") { const d = getDB(); const r = applyTopup(d, pkgId, method); if (r.ok) { commit(r.d); ops.notify("admin", "شارژ پیامک", `${d.salon.name}: ${r.msg}`, "/admin/sms"); check(); } return { ok: r.ok, msg: r.msg }; },
  setAuto(a: SmsAccount["autoRecharge"]) { const d = getDB(); commit({ ...d, smsAccounts: d.smsAccounts.map((x) => (x.tenantId === SMS_TENANT ? { ...x, autoRecharge: a } : x)) }); },
  setOptOut(v: boolean) { const d = getDB(); commit({ ...d, smsAccounts: d.smsAccounts.map((x) => (x.tenantId === SMS_TENANT ? { ...x, optOut: v } : x)) }); },

  /** خرید خط اختصاصی با شماره‌ی دلخواه؛ پس از پرداخت درخواست ثبت و منتظر تأیید مدارک می‌شود */
  buyLine(number: string, kyc: { holder: string; idNo: string; doc: boolean }, method: "online" | "wallet"): { ok: boolean; msg: string } {
    const d = getDB(); const a = myAccount(d);
    if (a.line.kind === "dedicated" && a.line.status !== "رد شد") return { ok: false, msg: "شما قبلاً خط اختصاصی دارید." };
    const tier = tierOf(number); const price = d.smsPricing.lineBase + (d.smsPricing.tierPrices[tier] ?? 0);
    const wallet = d.wallets.s1 ?? 0;
    if (method === "wallet" && wallet < price) return { ok: false, msg: `کیف پول (${toman(wallet)}) برای این شماره کافی نیست.` };
    commit({
      ...d, wallets: method === "wallet" ? { ...d.wallets, s1: wallet - price } : d.wallets,
      smsTx: [{ id: uid("x"), tenantId: SMS_TENANT, day: 0, kind: "خرید خط", amount: price, credits: 0, method: method === "wallet" ? "کیف پول پورسانت" : "آنلاین", note: `خط اختصاصی ${number} (${tier})` }, ...d.smsTx],
      smsAccounts: d.smsAccounts.map((x) => (x.tenantId === SMS_TENANT ? { ...x, line: { kind: "dedicated", number, status: "در انتظار تأیید", requestedAt: 0, tier, price, kyc } } : x)),
    });
    ops.notify("admin", "درخواست خط اختصاصی", `${d.salon.name}: شماره ${number} (${tier}) — ${toman(price)}؛ مدارک را بررسی کنید`, "/admin/sms");
    return { ok: true, msg: "پرداخت انجام و درخواست شما ثبت شد؛ پس از تأیید مدارک (تا ۲۴ ساعت) خط فعال می‌شود." };
  },
  adminLine(tenantId: string, approve: boolean, note = "") {
    const d = getDB(); const a = d.smsAccounts.find((x) => x.tenantId === tenantId);
    if (!a || a.line.status !== "در انتظار تأیید") return;
    commit({ ...d, smsAccounts: d.smsAccounts.map((x) => (x.tenantId === tenantId ? { ...x, line: approve ? { ...x.line, status: "فعال" } : { kind: "shared", number: "30005050", status: "فعال", requestedAt: 0, note: note || "مدارک تأیید نشد؛ مبلغ برگشت داده شد" } } : x)), wallets: !approve && tenantId === SMS_TENANT ? { ...d.wallets, s1: (d.wallets.s1 ?? 0) + (a.line.price ?? 0) } : d.wallets });
    if (tenantId === SMS_TENANT) ops.notify("salon", approve ? "خط اختصاصی شما فعال شد" : "درخواست خط اختصاصی رد شد", approve ? `شماره ${a.line.number} از این پس فرستنده‌ی پیام‌های سالن است.` : note || "مدارک تأیید نشد؛ مبلغ به کیف پول برگشت.", "/sms");
  },
  /** ادمین: یادآوری فروش شارژ به سالن‌های کم‌اعتبار */
  nudge(tenantId: string) { const d = getDB(); if (tenantId === SMS_TENANT) ops.notify("salon", "شارژ پیامک", `اعتبار شما ${fa(myAccount(d).balance)} پیامک است؛ با شارژ همین امروز، بسته‌ی پیشنهادی را با هدیه‌ی بیشتر بگیرید.`, "/sms"); },
  savePricing(p: SmsPricing) { const d = getDB(); commit({ ...d, smsPricing: p }); },
  gift(tenantId: string, credits: number, note: string) { const d = getDB(); commit({ ...d, smsAccounts: d.smsAccounts.map((x) => (x.tenantId === tenantId ? { ...x, balance: x.balance + credits } : x)), smsTx: [{ id: uid("x"), tenantId, day: 0, kind: "هدیه", amount: 0, credits, method: "—", note }, ...d.smsTx] }); },
};
