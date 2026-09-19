import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarCheck, Clock, Coins, Crown, Percent, ShoppingBag, UserPlus, Repeat, Wallet, PackageOpen, Trophy } from "lucide-react";
import { Avatar, Badge, Card, CardHead, PageTitle, Stat, Button, LinkButton, type Tone } from "@/components/ui";
import { fa, short, toman } from "@/lib/fa";
import { opportunities, staff, svcProfit, week, TODAY } from "@/lib/mock";

const oppIcon = { lost: AlertTriangle, vip: Crown, slot: Clock, stock: PackageOpen } as const;

function WeekChart() {
  const max = Math.max(...week.map((w) => w.v));
  return (
    <div className="flex h-44 items-end gap-1.5 px-4 pb-5 sm:gap-3 sm:px-5" role="img" aria-label="نمودار فروش هفتگی به میلیون تومان">
      {week.map((w, i) => {
        const today = i === 0;
        return (
          <div key={w.d} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-ink2">{fa(w.v)}</span>
            <div className="w-full rounded-t-lg" style={{ height: `${(w.v / max) * 100}%`, background: today ? "var(--rose)" : "var(--rose-soft)" }} />
            <span className={`text-[11px] ${today ? "font-bold text-rosedeep" : "text-ink3"}`}><span className="sm:hidden">{w.d.slice(0, 1)}</span><span className="hidden sm:inline">{w.d}</span></span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const ranked = [...staff].sort((a, b) => b.revenue - a.revenue);
  return (
    <>
      <PageTitle
        title="صبح بخیر، مدیر عزیز ☀️"
        sub={`${TODAY} · اینجا وضعیت سالن و فرصت‌های امروز را می‌بینید`}
        actions={<><Button variant="ghost">گزارش دیروز</Button><LinkButton href="/calendar/new">+ نوبت جدید</LinkButton></>}
      />

      {/* امروز */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="فروش امروز" value={short(18_500_000)} sub="+۱۲٪ نسبت به شنبه قبل" tone="rose" icon={<Wallet size={16} />} />
        <Stat label="نوبت‌های امروز" value={fa(27)} sub="۱۴ انجام‌شده" tone="sky" icon={<CalendarCheck size={16} />} />
        <Stat label="مشتری جدید" value={fa(4)} tone="sage" icon={<UserPlus size={16} />} />
        <Stat label="مشتری برگشتی" value={fa(19)} sub="۸۳٪ از کل" tone="gold" icon={<Repeat size={16} />} />
        <Stat label="ظرفیت خالی" value={`${fa(6)} نوبت`} sub="۱۵ تا ۱۸" tone="amber" icon={<Clock size={16} />} />
        <Stat label="فروش محصول" value={short(3_200_000)} tone="rose" icon={<ShoppingBag size={16} />} />
        <Stat label="کمیسیون" value={short(5_400_000)} tone="neutral" icon={<Percent size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {/* فرصت‌ها */}
        <Card className="xl:col-span-2">
          <CardHead title="⚠️ فرصت‌های امروز" hint="کارهایی که همین حالا به درآمد سالن اضافه می‌کنند" />
          <ul className="divide-y divide-line">
            {opportunities.map((o) => {
              const Icon = oppIcon[o.icon as keyof typeof oppIcon];
              const tone = o.tone as Tone;
              return (
                <li key={o.text} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
                  <Badge tone={tone} className="size-9 justify-center !rounded-xl !p-0"><Icon size={17} /></Badge>
                  <p className="min-w-0 flex-1 basis-40 text-sm text-ink">{o.text}</p>
                  <Link href={o.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-rose hover:text-rosedeep">
                    {o.cta} <ArrowLeft size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHead title="🏆 برترین‌های ماه" action={<Trophy size={18} className="text-gold" />} />
          <ul className="px-5 pb-4">
            {ranked.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="w-4 text-center text-xs font-bold text-ink3">{fa(i + 1)}</span>
                <Avatar name={s.name} color={s.color} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-[11px] text-ink3">رضایت {fa(s.rating)} · بازگشت {fa(s.returning)}٪</p>
                </div>
                <span className="text-[13px] font-bold text-ink">{short(s.revenue)}</span>
              </li>
            ))}
          </ul>
          <div className="mx-5 mb-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
            <Badge tone="gold">پرفروش: مریم حسینی</Badge>
            <Badge tone="sage">وفادارترین مشتریان: الهام رضایی</Badge>
          </div>
        </Card>

        {/* فروش هفته */}
        <Card className="xl:col-span-2">
          <CardHead title="فروش هفته (میلیون تومان)" hint="مقایسه روزها؛ امروز پررنگ است" />
          <WeekChart />
        </Card>

        {/* سودآوری خدمات */}
        <Card>
          <CardHead title="کدام خدمت سودآورتر است؟" hint="حاشیه سود پس از مواد و کمیسیون" />
          <ul className="space-y-3.5 px-5 pb-5">
            {svcProfit.map((s) => (
              <li key={s.name}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-ink2">{fa(s.profit)}٪ سود · {fa(s.rev)}٪ سهم فروش</span>
                </div>
                <div className="h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-sage" style={{ width: `${s.profit}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5 flex flex-wrap items-center gap-4 px-5 py-4">
        <Coins className="text-gold" />
        <p className="flex-1 text-sm text-ink2">درآمد ماه تا امروز: <b className="text-ink">{toman(258_900_000)}</b> — ۷۴٪ هدف ماهانه</p>
        <div className="h-2 w-48 rounded-full bg-surface2"><div className="h-2 w-[74%] rounded-full bg-rose" /></div>
      </Card>
    </>
  );
}
