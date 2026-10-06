"use client";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarCheck, CalendarX, Clock, HandCoins, Percent, Repeat, ShoppingBag, Trophy, UserPlus, Wallet } from "lucide-react";
import { Avatar, Badge, Card, CardHead, Stat, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { ErrorNote, Spinner } from "./ui";
import { crm } from "@/lib/crmApi";
import { ApiError, errorText } from "@/lib/api";
import { faDate, faNum, shortToman, todayLocal } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const STAFF_COLORS = ["#b5476b", "#d9b56f", "#6f9c86", "#6a8fb5"];

function Board() {
  const me = useMe();
  const q = useQuery(crm.dashboard, []);
  if (!canManage(me)) {
    return <Card className="p-6 text-sm leading-7 text-ink2">داشبورد مالی فقط برای مالک سالن نمایش داده می‌شود. از منوی کناری به <Link href="/calendar" className="font-bold text-rose">تقویم</Link> یا <Link href="/cashier" className="font-bold text-rose">صندوق</Link> بروید.</Card>;
  }
  if (q.loading && !q.data) return <Spinner />;
  if (q.error instanceof ApiError && q.error.status === 403) {
    return <Card className="p-6 text-sm leading-7 text-ink2">داشبورد جزو پلن فعلی شما نیست. برای دیدن آمار فروش و نوبت‌ها پلن را ارتقا دهید.</Card>;
  }
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const d = q.data;
  const maxW = Math.max(1, ...d.week.map((w) => w.revenue));
  const opps: { icon: typeof Clock; text: string; cta: string; href: string; tone: Tone }[] = [
    d.opportunities.inactiveCustomers ? { icon: AlertTriangle, text: `${faNum(d.opportunities.inactiveCustomers)} مشتری بیش از ۴۵ روز است مراجعه نکرده‌اند`, cta: "دیدن مشتریان", href: "/customers", tone: "danger" as Tone } : null,
    d.opportunities.pendingAppointments ? { icon: CalendarX, text: `${faNum(d.opportunities.pendingAppointments)} نوبت منتظر تأیید شماست`, cta: "بررسی نوبت‌ها", href: "/calendar", tone: "amber" as Tone } : null,
    d.load.freeHours > 0 ? { icon: Clock, text: `${faNum(d.load.freeHours)} ساعت ظرفیت خالی برای امروز`, cta: "دیدن تقویم", href: "/calendar", tone: "amber" as Tone } : null,
    d.opportunities.debt > 0 ? { icon: HandCoins, text: `${shortToman(d.opportunities.debt)} تومان بدهی مشتریان وصول نشده`, cta: "دریافت بدهی", href: "/cashier", tone: "danger" as Tone } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <>
      <section className="relative mb-4 overflow-hidden rounded-[28px] bg-[image:var(--grad-plum)] p-5 text-white shadow-[var(--shadow-pop)] md:p-7">
        <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.35),transparent_65%)]" />
        <div className="relative">
          <p className="text-[13px] text-white/70">{faDate.full(d.date)}</p>
          <p className="mt-4 text-xs text-white/60">فروش امروز</p>
          <p className="font-num mt-1 flex items-baseline gap-1.5 text-[34px] font-extrabold leading-none tracking-tight md:text-5xl">{shortToman(d.revenue)}<span className="text-sm font-semibold text-white/60">تومان</span></p>
          <p className="mt-2 text-xs text-[#e6c88e]">{d.deltaVsLastWeek === null ? `${faNum(d.invoices)} فاکتور` : `${d.deltaVsLastWeek >= 0 ? "▲ +" : "▼ −"}${faNum(Math.abs(d.deltaVsLastWeek))}٪ نسبت به هفته‌ی قبل`}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[[faNum(d.appointments.total), "نوبت امروز"], [faNum(d.customers.new), "مشتری جدید"], [`${faNum(d.load.pct)}٪`, "پُری تقویم"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur"><p className="font-num text-lg font-extrabold">{v}</p><p className="text-[11px] text-white/65">{l}</p></div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/calendar" className="press inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-[image:var(--grad-gold)] px-4 text-[13.5px] font-extrabold text-plum sm:flex-none">تقویم</Link>
            <Link href="/cashier" className="press inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-white/12 px-4 text-[13.5px] font-bold text-white sm:flex-none">صندوق</Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="نوبت‌های امروز" value={faNum(d.appointments.total)} sub={`${faNum(d.appointments.done)} انجام‌شده`} tone="sky" icon={<CalendarCheck size={16} />} />
        <Stat label="مشتری برگشتی" value={faNum(d.customers.returning)} tone="gold" icon={<Repeat size={16} />} />
        <Stat label="ظرفیت خالی" value={`${faNum(d.load.freeHours)} ساعت`} sub={`${faNum(d.load.pct)}٪ پُر`} tone="amber" icon={<Clock size={16} />} />
        <Stat label="فروش محصول" value={shortToman(d.products)} tone="rose" icon={<ShoppingBag size={16} />} />
        <Stat label="مشتری جدید" value={faNum(d.customers.new)} tone="sage" icon={<UserPlus size={16} />} />
        <Stat label="کمیسیون امروز" value={shortToman(d.commission)} tone="neutral" icon={<Percent size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="فرصت‌های امروز" hint="کارهایی که همین حالا به درآمد سالن اضافه می‌کنند" />
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
          <CardHead title="برترین‌های ۳۰ روز اخیر" action={<Trophy size={18} className="text-gold" />} />
          <ul className="px-5 pb-4">
            {d.topStaff.map((s, i) => (
              <li key={s.staffId} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-center text-xs font-bold text-ink3">{faNum(i + 1)}</span>
                <Avatar name={s.name} color={STAFF_COLORS[i % STAFF_COLORS.length]} size={34} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name}</p><p className="text-[11px] text-ink3">کمیسیون {shortToman(s.commission)}</p></div>
                <span className="text-[13px] font-bold text-ink">{shortToman(s.revenue)}</span>
              </li>
            ))}
            {!d.topStaff.length && <li className="py-6 text-center text-sm text-ink3">هنوز فروش خدمتی ثبت نشده است.</li>}
          </ul>
        </Card>

        <Card className="xl:col-span-2">
          <CardHead title="فروش ۷ روز اخیر" hint="میلیون تومان؛ امروز پررنگ است" />
          <div className="flex h-44 items-end gap-1.5 px-4 pb-5 sm:gap-3 sm:px-5" role="img" aria-label="نمودار فروش هفتگی">
            {d.week.map((w) => {
              const isToday = w.date === todayLocal();
              return (
                <div key={w.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink2">{faNum((w.revenue / 1_000_000).toFixed(1).replace(".0", "").replace(".", "٫"))}</span>
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max(3, (w.revenue / maxW) * 100)}%`, background: isToday ? "var(--grad-rose)" : "var(--rose-soft)" }} />
                  <span className={`text-[11px] ${isToday ? "font-bold text-rosedeep" : "text-ink3"}`}>{faDate.weekday(w.date)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead title="کدام خدمت سودآورتر است؟" hint="حاشیه‌ی سود پس از مواد و کمیسیون · سهم از فروش ۳۰ روز" />
          <ul className="space-y-3.5 px-5 pb-5">
            {d.services.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex justify-between gap-2 text-[13px]"><span className="font-semibold">{s.name}</span><span className="text-ink2">{faNum(s.margin)}٪ سود · {faNum(s.share)}٪ فروش</span></div>
                <div className="h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-sage" style={{ width: `${Math.max(3, Math.min(100, s.margin))}%` }} /></div>
              </li>
            ))}
            {!d.services.length && <li className="text-sm text-ink3">هنوز فروش خدمتی ثبت نشده است.</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-5 flex flex-wrap items-center gap-4 px-5 py-4">
        <Wallet className="text-gold" />
        <p className="min-w-0 flex-1 basis-56 text-sm text-ink2">درآمد ۳۰ روز اخیر: <b className="text-ink">{shortToman(d.month.revenue)} تومان</b> · سود پس از هزینه‌ها: <b className="text-ink">{shortToman(d.month.net)}</b></p>
        <Link href="/cashier" className="text-[13px] font-semibold text-rose">صندوق ←</Link>
      </Card>
    </>
  );
}

export function LiveDashboard() {
  return <LiveGate><Board /></LiveGate>;
}
