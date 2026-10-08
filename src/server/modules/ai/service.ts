import { prisma } from "../../db";
import { assertModuleActive } from "../../platform/modules/service";
import { addDays, tehranNow } from "../calendar/availability";
import { dayLoad } from "../calendar/service";
import { listDebts, summary } from "../cashier/service";
import { SUGGESTIONS, intentOf, pctChange } from "./intent";

// Answers come straight from the salon's own data (no language model). Every query is scoped by tenantId.

export type Answer = { topic: string; text: string; bullets?: string[]; actions?: { label: string; href: string }[] };
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const toman = (n: number) => `${fa(Math.round(n).toLocaleString("en-US"))} تومان`;
const on = (tenantId: string, id: string) => assertModuleActive(tenantId, id).then(() => true, () => false);

export const suggestions = () => SUGGESTIONS;

export async function ask(tenantId: string, question: string): Promise<Answer> {
  const { intent, day } = intentOf(question);
  const today = tehranNow().date;
  switch (intent) {
    case "sales_drop": {
      const [w1, w0] = await Promise.all([summary(tenantId, addDays(today, -6), today), summary(tenantId, addDays(today, -13), addDays(today, -7))]);
      const ch = pctChange(w1.revenue, w0.revenue);
      const bullets = [`فروش ۷ روز اخیر ${toman(w1.revenue)}؛ هفته‌ی قبل‌تر ${toman(w0.revenue)}${ch === null ? "" : ` (${ch >= 0 ? "+" : "−"}${fa(Math.abs(ch))}٪)`}.`];
      const inactive = await inactiveCustomers(tenantId, 45);
      if (inactive.length) bullets.push(`${fa(inactive.length)} مشتری بیش از ۴۵ روز است مراجعه نکرده‌اند.`);
      return { topic: "sales", text: ch !== null && ch < 0 ? "فروش این هفته نسبت به هفته‌ی قبل کاهش داشته است." : "فروش این هفته نسبت به هفته‌ی قبل کاهش نداشته است.", bullets, actions: [{ label: "ساخت کمپین بازگشت", href: "/campaigns" }, { label: "داشبورد", href: "/" }] };
    }
    case "capacity": {
      const date = addDays(today, day), l = await dayLoad(tenantId, date);
      if (!l.capacity) return { topic: "capacity", text: `${day ? "فردا" : "امروز"} سالن تعطیل است یا متخصصی سر کار نیست.`, actions: [{ label: "تنظیم ساعت کاری", href: "/settings" }] };
      return { topic: "capacity", text: `${day ? "فردا" : "امروز"} ${fa(Math.max(0, Math.round((l.capacity - l.booked) / 60)))} ساعت ظرفیت خالی دارید (${fa(l.pct)}٪ پُر).`, actions: [{ label: "دیدن تقویم", href: "/calendar" }, { label: "کمپین پر کردن ظرفیت", href: "/campaigns" }] };
    }
    case "outreach": {
      const rows = (await inactiveCustomers(tenantId, 30)).slice(0, 5);
      if (!rows.length) return { topic: "outreach", text: "فعلاً مشتری‌ای نیست که مدتی مراجعه نکرده باشد.", actions: [{ label: "ساخت کمپین", href: "/campaigns" }] };
      return { topic: "outreach", text: `این ${fa(rows.length)} مشتری ارزشمند مدتی است نیامده‌اند:`, bullets: rows.map((r) => `${r.name} — ${fa(r.days)} روز بدون مراجعه · مجموع خرید ${toman(r.spent)}`), actions: [{ label: "ساخت کمپین بازگشت", href: "/campaigns" }] };
    }
    case "margin": {
      const svc = await prisma.service.findMany({ where: { tenantId, active: true, archivedAt: null, price: { gt: 0 } }, select: { name: true, price: true, materialCost: true, commissionPct: true } });
      const r = svc.map((s) => ({ s, profit: s.price - s.materialCost - (s.price * s.commissionPct) / 100 })).map((x) => ({ ...x, m: Math.round((x.profit / x.s.price) * 100) })).sort((a, b) => b.m - a.m);
      if (!r.length) return { topic: "margin", text: "هنوز خدمتی تعریف نشده است.", actions: [{ label: "منوی خدمات", href: "/services" }] };
      return { topic: "margin", text: `سودآورترین خدمت «${r[0].s.name}» با حاشیه‌ی ${fa(r[0].m)}٪ است.`, bullets: r.slice(0, 4).map((x) => `${x.s.name}: ${fa(x.m)}٪ (سود هر بار ${toman(x.profit)})`), actions: [{ label: "منوی خدمات", href: "/services" }] };
    }
    case "debt": {
      const debts = await listDebts(tenantId);
      if (!debts.length) return { topic: "debt", text: "هیچ مشتری‌ای بدهی پرداخت‌نشده ندارد.", actions: [{ label: "صندوق", href: "/cashier" }] };
      return { topic: "debt", text: `مجموع بدهی مشتریان ${toman(debts.reduce((a, d) => a + d.debt, 0))} از ${fa(debts.length)} نفر است.`, bullets: debts.slice(0, 5).map((d) => `${d.name}: ${toman(d.debt)}`), actions: [{ label: "دریافت بدهی", href: "/cashier" }] };
    }
    case "stock": {
      if (!(await on(tenantId, "inventory"))) return { topic: "stock", text: "ماژول انبار برای این سالن فعال نیست.", actions: [{ label: "ماژول‌ها", href: "/modules" }] };
      const items = await prisma.product.findMany({ where: { tenantId, archivedAt: null }, select: { name: true, stock: true, reorder: true } });
      const low = items.filter((p) => p.stock <= p.reorder);
      return { topic: "stock", text: low.length ? `${fa(low.length)} کالا به نقطه‌ی سفارش رسیده است:` : "همه‌ی کالاها موجودی کافی دارند.", bullets: low.slice(0, 6).map((p) => `${p.name}: ${fa(p.stock)} عدد (نقطه‌ی سفارش ${fa(p.reorder)})`), actions: [{ label: "انبار", href: "/procurement" }] };
    }
    case "staff": {
      const m = await summary(tenantId, addDays(today, -29), today);
      if (!m.byStaff.length) return { topic: "staff", text: "در ۳۰ روز اخیر فروش خدمتی با متخصص ثبت نشده است.", actions: [{ label: "صندوق", href: "/cashier" }] };
      return { topic: "staff", text: `پرفروش‌ترین متخصص ۳۰ روز اخیر ${m.byStaff[0].name} است.`, bullets: m.byStaff.slice(0, 4).map((s) => `${s.name}: فروش ${toman(s.revenue)} · کمیسیون ${toman(s.commission)}`), actions: [{ label: "تسویه پرسنل", href: "/staff/settle" }] };
    }
    case "revenue": {
      const [t, m] = await Promise.all([summary(tenantId, today, today), summary(tenantId, addDays(today, -29), today)]);
      return { topic: "revenue", text: `فروش امروز ${toman(t.revenue)} (${fa(t.count)} فاکتور) و ۳۰ روز اخیر ${toman(m.revenue)} است.`, bullets: [`سود ۳۰ روز پس از هزینه‌ها: ${toman(m.net)}`, `فروش محصول ۳۰ روز: ${toman(m.products)}`, `تخفیف‌های داده‌شده: ${toman(m.discounts)}`], actions: [{ label: "داشبورد", href: "/" }, { label: "صندوق", href: "/cashier" }] };
    }
    default:
      return { topic: "help", text: "می‌توانید این‌ها را بپرسید:", bullets: SUGGESTIONS };
  }
}

/** Customers with a visit history who haven't been back for `days`, most valuable first. */
async function inactiveCustomers(tenantId: string, days: number) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.$queryRaw<{ id: string; name: string; last: Date }[]>`
    SELECT c."id", c."name", v.last FROM (SELECT "customerId", MAX("at") AS last FROM "CustomerVisit" WHERE "tenantId" = ${tenantId} GROUP BY "customerId") v
    JOIN "Customer" c ON c."id" = v."customerId" WHERE c."archivedAt" IS NULL AND v.last < ${cutoff}`;
  if (!rows.length) return [];
  const spent = new Map((await prisma.sale.groupBy({ by: ["customerId"], where: { tenantId, status: { not: "VOID" }, customerId: { in: rows.map((r) => r.id) } }, _sum: { total: true } })).map((s) => [s.customerId, s._sum.total ?? 0]));
  return rows.map((r) => ({ id: r.id, name: r.name, days: Math.floor((Date.now() - r.last.getTime()) / 86_400_000), spent: spent.get(r.id) ?? 0 })).sort((a, b) => b.spent - a.spent);
}
