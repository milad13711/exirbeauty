"use client";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarCheck, Clock, Crown, HandCoins, PackageOpen, Percent, Repeat, ShoppingBag, Trophy, UserPlus, Wallet, CalendarX } from "lucide-react";
import { Avatar, Badge, Card, CardHead, Stat, type Tone } from "@/components/ui";
import { useDB } from "@/lib/db";
import { dayLoad } from "@/lib/booking";
import { dayInfo } from "@/lib/dates";
import { summarize } from "@/lib/sales";
import { moduleActive, moduleForPath } from "@/lib/modules";
import { fa, short } from "@/lib/fa";

export default function Dashboard() {
  const db = useDB();
  const today = summarize(db, 0);
  const lastWeek = summarize(db, -7);
  const load = dayLoad(db, 0);
  const todayAppts = db.appts.filter((a) => a.day === 0);
  const custToday = new Set(today.sales.map((s) => s.customerId).filter(Boolean) as string[]);
  const newToday = [...custToday].filter((id) => (db.customers.find((c) => c.id === id)?.visits ?? 0) <= 1).length;
  const delta = lastWeek.revenue ? Math.round(((today.revenue - lastWeek.revenue) / lastWeek.revenue) * 100) : null;

  // فرصت‌های امروز از داده‌ی واقعی
  const inactive = db.customers.filter((c) => c.lastVisitDays >= 45 && c.visits > 0);
  const booked = new Set(db.appts.filter((a) => a.day >= 0 && a.status !== "done" && a.customerId).map((a) => a.customerId));
  const vipNoAppt = db.customers.filter((c) => c.tier === "VIP" && !booked.has(c.id));
  const pending = db.appts.filter((a) => a.status === "pending").length;
  const lowStock = db.inv.filter((x) => x.stock <= x.reorder);
  const debt = db.customers.reduce((a, c) => a + c.debt, 0);
  const freeHours = Math.max(0, Math.round((load.capacity - load.booked) / 60));
  const opps: { icon: typeof Clock; text: string; cta: string; href: string; tone: Tone }[] = [
    inactive.length ? { icon: AlertTriangle, text: `${fa(inactive.length)} مشتری بیش از ۴۵ روز است مراجعه نکرده‌اند`, cta: "ارسال کمپین بازگشت", href: "/campaigns", tone: "danger" as Tone } : null,
    vipNoAppt.length ? { icon: Crown, text: `${fa(vipNoAppt.length)} مشتری VIP نوبت پیش‌رو ندارند`, cta: "دیدن مشتریان", href: "/customers", tone: "gold" as Tone } : null,
    pending ? { icon: CalendarX, text: `${fa(pending)} نوبت منتظر تأیید شماست`, cta: "بررسی نوبت‌ها", href: "/calendar", tone: "amber" as Tone } : null,
    freeHours > 0 ? { icon: Clock, text: `${fa(freeHours)} ساعت ظرفیت خالی برای امروز`, cta: "دیدن تقویم", href: "/calendar", tone: "amber" as Tone } : null,
    lowStock.length ? { icon: PackageOpen, text: `${lowStock.map((x) => x.name).slice(0, 2).join("، ")} به نقطه‌ی سفارش رسیده`, cta: "ثبت ورود کالا", href: "/procurement", tone: "sky" as Tone } : null,
    debt > 0 ? { icon: HandCoins, text: `${short(debt)} تومان بدهی مشتریان وصول نشده`, cta: "دریافت بدهی", href: "/cashier", tone: "danger" as Tone } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x).filter((x) => { const m = moduleForPath(x.href); return !m || moduleActive(db, m.id); });

  // هفته‌ی اخیر
  const week = Array.from({ length: 7 }, (_, i) => -6 + i).map((d) => ({ d, v: summarize(db, d).revenue }));
  const maxW = Math.max(1, ...week.map((w) => w.v));
  // سودآوری خدمات (حاشیه‌ی سود پس از مواد و کمیسیون) و سهم فروش ۳۰ روز اخیر
  const m30 = summarize(db, -29, 0);
  const rev30 = new Map<string, number>();
  m30.sales.forEach((s) => s.lines.forEach((l) => { if (l.kind === "service") rev30.set(l.refId, (rev30.get(l.refId) ?? 0) + l.price * l.qty); }));
  const totalSvc = [...rev30.values()].reduce((a, b) => a + b, 0) || 1;
  const svc = db.services.filter((s) => rev30.has(s.id)).map((s) => ({ name: s.name, margin: Math.round(((s.price - s.materialCost - (s.price * s.commission) / 100) / s.price) * 100), share: Math.round(((rev30.get(s.id) ?? 0) / totalSvc) * 100) })).sort((a, b) => b.share - a.share).slice(0, 4);
  const ranked = [...db.staff].filter((s) => s.active).sort((a, b) => b.revenue - a.revenue);

  return (
    <>
      <section className="relative mb-4 overflow-hidden rounded-[28px] bg-[image:var(--grad-plum)] p-5 text-white shadow-[var(--shadow-pop)] md:p-7">
        <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.35),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-24 right-0 size-64 rounded-full bg-[radial-gradient(circle,rgba(198,90,128,.4),transparent_65%)]" />
        <div className="relative">
          <p className="text-[13px] text-white/70">صبح بخیر ☀️ · {dayInfo(0).full}</p>
          <p className="mt-4 text-xs text-white/60">فروش امروز {db.salon.name}</p>
          <p className="font-num mt-1 flex items-baseline gap-1.5 text-[34px] font-extrabold leading-none tracking-tight md:text-5xl">{short(today.revenue)}<span className="text-sm font-semibold text-white/60">تومان</span></p>
          <p className="mt-2 text-xs text-[#e6c88e]">{delta === null ? `${fa(today.count)} فاکتور` : `${delta >= 0 ? "▲ +" : "▼ −"}${fa(Math.abs(delta))}٪ نسبت به هفته‌ی قبل`}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[[fa(todayAppts.length), "نوبت امروز"], [fa(newToday), "مشتری جدید"], [`${fa(load.pct)}٪`, "پُری تقویم"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur"><p className="font-num text-lg font-extrabold">{v}</p><p className="text-[11px] text-white/65">{l}</p></div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/calendar/new" className="press inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-[image:var(--grad-gold)] px-4 text-[13.5px] font-extrabold text-plum sm:flex-none">＋ نوبت</Link>
            <Link href="/cashier" className="press inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-white/12 px-4 text-[13.5px] font-bold text-white sm:flex-none">صندوق</Link>
            <Link href="/reports" className="press inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-white/12 px-4 text-[13.5px] font-bold text-white sm:flex-none">گزارش‌ها</Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
        <Stat label="نوبت‌های امروز" value={fa(todayAppts.length)} sub={`${fa(todayAppts.filter((a) => a.status === "done").length)} انجام‌شده`} tone="sky" icon={<CalendarCheck size={16} />} />
        <Stat label="مشتری برگشتی" value={fa(custToday.size - newToday)} tone="gold" icon={<Repeat size={16} />} />
        <Stat label="ظرفیت خالی" value={`${fa(freeHours)} ساعت`} sub={`${fa(load.pct)}٪ پُر`} tone="amber" icon={<Clock size={16} />} />
        <Stat label="فروش محصول" value={short(today.products)} tone="rose" icon={<ShoppingBag size={16} />} />
        <Stat label="مشتری جدید" value={fa(newToday)} tone="sage" icon={<UserPlus size={16} />} />
        <Stat label="کمیسیون" value={short(today.commission)} tone="neutral" icon={<Percent size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="⚠️ فرصت‌های امروز" hint="کارهایی که همین حالا به درآمد سالن اضافه می‌کنند" />
          <ul className="divide-y divide-line">
            {opps.map((o) => {
              const Icon = o.icon;
              return (
                <li key={o.text} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
                  <Badge tone={o.tone} className="size-9 justify-center !rounded-xl !p-0"><Icon size={17} /></Badge>
                  <p className="min-w-0 flex-1 basis-40 text-sm text-ink">{o.text}</p>
                  <Link href={o.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-rose hover:text-rosedeep">{o.cta} <ArrowLeft size={14} /></Link>
                </li>
              );
            })}
            {!opps.length && <li className="px-5 py-8 text-center text-sm text-ink3">همه‌چیز رو به راه است؛ فرصت فوری‌ای وجود ندارد 🎉</li>}
          </ul>
        </Card>

        <Card>
          <CardHead title="🏆 برترین‌های ماه" action={<Trophy size={18} className="text-gold" />} />
          <ul className="px-5 pb-4">
            {ranked.slice(0, 4).map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-center text-xs font-bold text-ink3">{fa(i + 1)}</span>
                <Avatar name={s.name} color={s.color} size={34} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name}</p><p className="text-[11px] text-ink3">{s.rating ? `رضایت ${fa(s.rating)} · ` : ""}بازگشت {fa(s.returning)}٪</p></div>
                <span className="text-[13px] font-bold text-ink">{short(s.revenue)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-2">
          <CardHead title="فروش ۷ روز اخیر" hint="میلیون تومان؛ امروز پررنگ است" />
          <div className="flex h-44 items-end gap-1.5 px-4 pb-5 sm:gap-3 sm:px-5" role="img" aria-label="نمودار فروش هفتگی">
            {week.map((w) => {
              const isToday = w.d === 0;
              return (
                <div key={w.d} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink2">{fa((w.v / 1_000_000).toFixed(1).replace(".0", "").replace(".", "٫"))}</span>
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max(3, (w.v / maxW) * 100)}%`, background: isToday ? "var(--grad-rose)" : "var(--rose-soft)" }} />
                  <span className={`text-[11px] ${isToday ? "font-bold text-rosedeep" : "text-ink3"}`}><span className="sm:hidden">{dayInfo(w.d).weekday.slice(0, 1)}</span><span className="hidden sm:inline">{dayInfo(w.d).weekday}</span></span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="کدام خدمت سودآورتر است؟" hint="حاشیه‌ی سود پس از مواد و کمیسیون · سهم از فروش ۳۰ روز" />
          <ul className="space-y-3.5 px-5 pb-5">
            {svc.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex justify-between gap-2 text-[13px]"><span className="font-semibold">{s.name}</span><span className="text-ink2">{fa(s.margin)}٪ سود · {fa(s.share)}٪ فروش</span></div>
                <div className="h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-sage" style={{ width: `${Math.max(3, s.margin)}%` }} /></div>
              </li>
            ))}
            {!svc.length && <li className="text-sm text-ink3">هنوز فروش خدمتی ثبت نشده است.</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-5 flex flex-wrap items-center gap-4 px-5 py-4">
        <Wallet className="text-gold" />
        <p className="min-w-0 flex-1 basis-56 text-sm text-ink2">درآمد ۳۰ روز اخیر: <b className="text-ink">{short(m30.revenue)} تومان</b> · سود پس از هزینه‌ها: <b className="text-ink">{short(m30.net)}</b></p>
        <Link href="/reports" className="text-[13px] font-semibold text-rose">گزارش کامل ←</Link>
      </Card>
    </>
  );
}
