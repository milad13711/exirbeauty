import type { Customer, DB } from "./db";
import { dayLoad, findSlot, clock } from "./booking";
import { dayInfo } from "./dates";
import { summarize } from "./sales";
import { fa, short, toman } from "./fa";

export type Answer = { text: string; bullets?: string[]; actions?: { label: string; href: string }[]; topic: string };

const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[‌‏]/g, " ").replace(/\s+/g, " ").trim();
const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

/** مشتری‌هایی که چرخه‌ی مراجعه‌شان رسیده یا گذشته، به ترتیب ارزش */
function dueCustomers(d: DB): { c: Customer; over: number }[] {
  return d.customers.filter((c) => c.cycleDays > 0 && c.lastVisitDays >= c.cycleDays - 3 && c.visits > 0)
    .map((c) => ({ c, over: c.lastVisitDays - c.cycleDays })).sort((a, b) => b.c.total - a.c.total);
}

export function answer(d: DB, raw: string): Answer {
  const q = norm(raw);

  // ---- چرا فروش کم شده؟
  if (has(q, "چرا", "کاهش", "کم شده", "افت") && has(q, "فروش", "درآمد")) {
    const w1 = summarize(d, -6, 0), w0 = summarize(d, -13, -7);
    const ch = pct(w1.revenue, w0.revenue);
    const cat = (from: number, to: number) => { const m = new Map<string, number>(); summarize(d, from, to).sales.forEach((s) => s.lines.forEach((l) => { if (l.kind === "service") m.set(l.name, (m.get(l.name) ?? 0) + l.price * l.qty); })); return m; };
    const a = cat(-6, 0), b = cat(-13, -7);
    const worst = [...b].map(([n, v]) => ({ n, diff: (a.get(n) ?? 0) - v })).sort((x, y) => x.diff - y.diff)[0];
    const due = dueCustomers(d);
    const b1 = [`فروش ۷ روز اخیر ${short(w1.revenue)} است؛ هفته‌ی قبل‌تر ${short(w0.revenue)} بود (${ch >= 0 ? "+" : "−"}${fa(Math.abs(ch))}٪).`];
    if (worst && worst.diff < 0) b1.push(`بیشترین افت مربوط به «${worst.n}» است (${short(-worst.diff)} کمتر).`);
    if (due.length) b1.push(`${fa(due.length)} مشتری وقت مراجعه‌شان رسیده یا گذشته ولی نوبت نگرفته‌اند؛ ارزش تقریبی: ${short(due.reduce((x, y) => x + y.c.avg, 0))}.`);
    return { topic: "sales", text: ch < 0 ? "فروش این هفته نسبت به هفته‌ی قبل کاهش داشته است." : "فروش این هفته نسبت به هفته‌ی قبل کاهش نداشته است؛ روند شما مثبت است.", bullets: b1, actions: due.length ? [{ label: "ارسال کمپین بازگشت", href: "/campaigns" }, { label: "دیدن گزارش‌ها", href: "/reports" }] : [{ label: "دیدن گزارش‌ها", href: "/reports" }] };
  }

  // ---- ظرفیت خالی
  if (has(q, "ظرفیت", "خالی", "وقت خالی", "نوبت خالی")) {
    const day = has(q, "فردا") ? 1 : 0;
    const l = dayLoad(d, day);
    if (!l.open) return { topic: "capacity", text: `${dayInfo(day).full} سالن تعطیل است.`, actions: [{ label: "تنظیم ساعت کاری", href: "/settings" }] };
    const lines = d.staff.filter((s) => s.active).map((s) => { const slot = findSlot(d, { serviceId: d.services.find((x) => x.staff.includes(s.id))?.id ?? "", staffId: s.id, from: day, to: day }); return slot ? `${s.name}: اولین وقت خالی ${clock(slot.start)}` : null; }).filter(Boolean) as string[];
    return { topic: "capacity", text: `${day ? "فردا" : "امروز"} ${fa(Math.max(0, Math.round((l.capacity - l.booked) / 60)))} ساعت ظرفیت خالی دارید (${fa(l.pct)}٪ پُر، ${fa(l.list.length)} نوبت).`, bullets: lines, actions: [{ label: "دیدن تقویم", href: "/calendar" }, { label: "لیست انتظار", href: "/calendar" }] };
  }

  // ---- به چه مشتری‌هایی پیام بدهم؟
  if (has(q, "پیام بدهم", "پیام بفرستم", "به چه مشتری", "پیگیری", "تماس بگیرم")) {
    const due = dueCustomers(d).slice(0, 4);
    if (!due.length) return { topic: "outreach", text: "فعلاً مشتری‌ای وقت مراجعه‌اش نرسیده است.", actions: [{ label: "ساخت کمپین", href: "/campaigns" }] };
    return { topic: "outreach", text: `این ${fa(due.length)} مشتری بیشترین احتمال بازگشت و ارزش را دارند:`, bullets: due.map(({ c, over }) => `${c.name} — ${over >= 0 ? `${fa(over)} روز از چرخه‌اش گذشته` : `${fa(-over)} روز تا چرخه‌اش`}${c.favService ? ` · ${c.favService}` : ""} · مجموع خرید ${short(c.total)}`), actions: [{ label: "ساخت کمپین بازگشت", href: "/campaigns" }, { label: "اتوماسیون", href: "/automation" }] };
  }

  // ---- برای مشتری X چه خدمتی؟
  const named = d.customers.find((c) => q.includes(norm(c.name)) || q.includes(norm(c.name.split(" ")[0])) );
  if (has(q, "چه خدمت", "پیشنهاد", "مشتری") && named) {
    const due = named.cycleDays > 0 ? named.cycleDays - named.lastVisitDays : null;
    const last = named.log[0];
    const b = [] as string[];
    if (last) b.push(`آخرین خدمت: ${last.s} (${last.d}) با ${last.by}`);
    if (due !== null) b.push(due <= 0 ? `چرخه‌ی مراجعه‌اش ${fa(-due)} روز است گذشته` : `${fa(due)} روز تا چرخه‌ی معمولش مانده`);
    if (named.allergies.length) b.push(`⚠️ ${named.allergies.join(" · ")}`);
    const rec = d.products.find((p) => p.active && p.stock > 0 && (last ? p.cat === (last.cat === "آرایش" ? "ست هدیه" : last.cat) : true));
    if (rec) b.push(`محصول مکمل: ${rec.name} (${short(rec.price)})`);
    return { topic: "customer", text: `برای ${named.name}: ${named.favService ? `خدمت موردعلاقه‌اش «${named.favService}» است؛ ` : ""}${due !== null && due <= 3 ? "الان زمان مناسب پیشنهاد نوبت است." : "پیشنهاد فوری ندارم."}`, bullets: b, actions: [{ label: "پروفایل مشتری", href: `/customers/${named.id}` }, { label: "ثبت نوبت", href: "/calendar/new" }] };
  }

  // ---- خدمت سودآور
  if (has(q, "سودآور", "حاشیه سود", "کدام خدمت")) {
    const r = d.services.filter((s) => s.active).map((s) => ({ s, m: Math.round(((s.price - s.materialCost - (s.price * s.commission) / 100) / s.price) * 100) })).sort((a, b) => b.m - a.m);
    return { topic: "margin", text: `سودآورترین خدمت «${r[0]?.s.name}» با حاشیه‌ی ${fa(r[0]?.m ?? 0)}٪ است.`, bullets: r.slice(0, 4).map(({ s, m }) => `${s.name}: ${fa(m)}٪ (سود هر بار ${short(s.price - s.materialCost - (s.price * s.commission) / 100)})`), actions: [{ label: "منوی خدمات", href: "/services" }] };
  }

  // ---- فروش / درآمد
  if (has(q, "فروش", "درآمد", "سود")) {
    const t = summarize(d, 0), m = summarize(d, -29, 0);
    return { topic: "revenue", text: `فروش امروز ${short(t.revenue)} (${fa(t.count)} فاکتور) و ۳۰ روز اخیر ${short(m.revenue)} است.`, bullets: [`سود ۳۰ روز پس از هزینه‌ها: ${short(m.net)}`, `فروش محصول ۳۰ روز: ${short(m.products)}`, `تخفیف‌های داده‌شده: ${short(m.discounts)}`], actions: [{ label: "گزارش کامل", href: "/reports" }] };
  }

  // ---- بهترین متخصص
  if (has(q, "متخصص", "پرسنل", "بهترین", "پرفروش")) {
    const r = [...d.staff].filter((s) => s.active).sort((a, b) => b.revenue - a.revenue);
    return { topic: "staff", text: `پرفروش‌ترین متخصص ماه ${r[0]?.name} با ${short(r[0]?.revenue ?? 0)} است.`, bullets: r.slice(0, 4).map((s) => `${s.name}: ${short(s.revenue)} · بازگشت ${fa(s.returning)}٪${s.rating ? ` · رضایت ${fa(String(s.rating).replace(".", "٫"))}` : ""}`), actions: [{ label: "پرسنل", href: "/staff" }] };
  }

  // ---- بدهی
  if (has(q, "بدهی", "بدهکار")) {
    const ds = d.customers.filter((c) => c.debt > 0);
    return { topic: "debt", text: ds.length ? `${fa(ds.length)} مشتری بدهی دارند؛ جمع ${toman(ds.reduce((a, c) => a + c.debt, 0))}.` : "هیچ مشتری بدهکاری ندارید 🎉", bullets: ds.map((c) => `${c.name}: ${toman(c.debt)}`), actions: ds.length ? [{ label: "دریافت بدهی", href: "/cashier" }] : undefined };
  }

  // ---- موجودی
  if (has(q, "موجودی", "کم شده", "سفارش", "انبار", "تمام")) {
    const low = d.inv.filter((x) => x.stock <= x.reorder);
    return { topic: "stock", text: low.length ? `${fa(low.length)} کالا به نقطه‌ی سفارش رسیده است.` : "موجودی همه‌ی کالاها کافی است.", bullets: low.map((x) => `${x.name}: ${fa(x.stock)} عدد (نقطه سفارش ${fa(x.reorder)}) · تأمین‌کننده ${x.supplier}`), actions: low.length ? [{ label: "ثبت ورود کالا", href: "/procurement" }] : undefined };
  }

  // ---- نظرسنجی
  if (has(q, "نظر", "رضایت", "شکایت")) {
    const ans = d.surveys.filter((s) => s.rating);
    const avg = ans.length ? ans.reduce((a, s) => a + (s.rating ?? 0), 0) / ans.length : 0;
    const open = d.surveys.filter((s) => s.route === "private" && !s.resolved);
    return { topic: "reviews", text: `میانگین رضایت ${fa(avg.toFixed(1).replace(".", "٫"))} از ۵ (${fa(ans.length)} نظر) و ${fa(open.length)} بازخورد خصوصی باز دارید.`, actions: [{ label: "نظرسنجی‌ها", href: "/reviews" }] };
  }

  return { topic: "help", text: "این‌ها را می‌توانم از روی داده‌های سالن جواب بدهم:", bullets: ["چرا فروش این هفته کم شده؟", "فردا چه ظرفیتی خالی دارم؟", "به چه مشتری‌هایی پیام بدهم؟", "برای سارا محمدی چه خدمتی پیشنهاد کنم؟", "کدام خدمت سودآورتر است؟", "موجودی چه کالاهایی کم شده؟", "کدام مشتری‌ها بدهی دارند؟"] };
}

export const suggestions = ["چرا فروش این هفته کم شده؟", "فردا چه ظرفیتی خالی دارم؟", "به چه مشتری‌هایی پیام بدهم؟", "کدام خدمت سودآورتر است؟", "کدام مشتری‌ها بدهی دارند؟", "موجودی چه کالاهایی کم شده؟"];
