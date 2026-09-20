"use client";
import Link from "next/link";
import { CalendarClock, Gift, ShoppingBag, Sparkles, UserPlus } from "lucide-react";
import { Badge, Card, CardHead, tierTone } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { useDB } from "@/lib/db";
import { dayInfo } from "@/lib/dates";
import { clock } from "@/lib/booking";
import { hoursUntil } from "@/lib/portal";
import { salons } from "@/lib/mock3";
import { fa, num, short, toman } from "@/lib/fa";
import { nextGoal } from "@/lib/sales";
import { moduleActive } from "@/lib/modules";
import { SurveyCard } from "@/components/portal/SurveyCard";

const catMap: Record<string, string> = { "مو": "مو", "پوست": "پوست", "ناخن": "ناخن", "آرایش": "ست هدیه" };

export default function MeHome() {
  const db = useDB();
  const me = useMe();
  if (!me) return null;
  const next = db.appts.filter((a) => a.customerId === me.id && a.status !== "done" && hoursUntil(a) > -2).sort((a, b) => a.day - b.day || a.start - b.start)[0];
  const goal = nextGoal(db.loyalty, me.points);
  const pct = Math.min(100, Math.round((me.points / (me.points + goal.left || 1)) * 100));
  const lastCat = me.log[0]?.cat ?? db.services.find((s) => s.name === me.favService)?.cat;
  const recs = db.products.filter((p) => p.active && p.stock > 0 && (!lastCat || p.cat === catMap[lastCat])).slice(0, 3);
  const ref = salons[0].code;
  const surveys = moduleActive(db, "reviews") ? db.surveys.filter((s) => s.customerId === me.id && s.status === "منتظر پاسخ") : [];

  return (
    <>
      <div><p className="text-xl font-extrabold">سلام {me.name.split(" ")[0]} 👋</p><p className="text-sm text-ink2">به پنل مشتری {db.salon.name} خوش آمدید</p></div>

      {surveys.map((s) => <SurveyCard key={s.id} s={s} />)}

      {next ? (
        <Card className="overflow-hidden">
          <div className="bg-rose p-5 text-white">
            <p className="flex items-center gap-1.5 text-xs text-white/75"><CalendarClock size={14} />نوبت بعدی شما</p>
            <p className="mt-1 text-xl font-extrabold">{dayInfo(next.day).weekday}، ساعت {clock(next.start)}</p>
            <p className="text-sm text-white/85">{next.service} · {db.staff.find((s) => s.id === next.staffId)?.name}</p>
            <p className="mt-1 text-xs text-white/70">{dayInfo(next.day).full}</p>
          </div>
          <div className="flex gap-2 p-3"><Link href="/me/appointments" className="flex-1 rounded-xl border border-line py-2 text-center text-[13px] font-semibold text-ink2">مدیریت نوبت</Link><Link href="/book" className="flex-1 rounded-xl bg-rosesoft py-2 text-center text-[13px] font-semibold text-rosedeep">نوبت جدید</Link></div>
        </Card>
      ) : (
        <Card className="p-5 text-center"><p className="text-sm text-ink2">نوبت فعالی ندارید.</p><Link href="/book" className="mt-3 inline-block rounded-xl bg-rose px-5 py-2.5 text-[13px] font-bold text-white">رزرو نوبت</Link></Card>
      )}

      <Card className="overflow-hidden">
        <div className="bg-plum p-5 text-white">
          <div className="flex items-center justify-between"><p className="text-xs text-white/60">مزایای من در این سالن</p><Badge tone={tierTone[me.tier]}>{me.tier}</Badge></div>
          <p className="mt-1 text-3xl font-extrabold">{num(me.points)} <span className="text-sm font-medium text-white/60">امتیاز</span></p>
          <div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1.5 text-xs text-white/65">{goal.left > 0 ? `${fa(goal.left)} امتیاز تا ${goal.label}` : goal.label}</p>
        </div>
        <Link href="/me/rewards" className="block p-3 text-center text-[13px] font-semibold text-rose">دیدن جایزه‌ها ←</Link>
      </Card>

      {me.debt > 0 && <p className="rounded-2xl bg-ambersoft p-4 text-sm text-amber">مبلغ {toman(me.debt)} از خدمات قبلی پرداخت نشده است؛ لطفاً در مراجعه‌ی بعد تسویه کنید.</p>}

      <div className="grid grid-cols-3 gap-2">
        {[{ h: "/store?ref=" + ref, l: "فروشگاه", i: ShoppingBag }, { h: "/me/wallet", l: toman(me.wallet).replace(" تومان", ""), i: Gift, sub: "اعتبار" }, { h: "/me/invite", l: "معرفی دوستان", i: UserPlus }].map(({ h, l, i: I, sub }) => (
          <Link key={h} href={h} className="rounded-2xl border border-line bg-surface p-3 text-center"><I size={20} className="mx-auto text-rose" /><p className="mt-1.5 text-[12px] font-bold leading-tight">{l}</p>{sub && <p className="text-[10px] text-ink3">{sub}</p>}</Link>
        ))}
      </div>

      {recs.length > 0 && (
        <Card>
          <CardHead title="پیشنهاد برای شما" hint="بر اساس آخرین خدمت شما" action={<Sparkles size={16} className="text-rose" />} />
          <ul className="divide-y divide-line">
            {recs.map((p) => (
              <li key={p.id}><Link href={`/store/p/${p.id}?ref=${ref}`} className="flex items-center gap-3 px-5 py-3"><span className="size-11 shrink-0 rounded-xl" style={{ background: `linear-gradient(150deg, ${p.tint[0]}, ${p.tint[1]})` }} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{p.name}</b><span className="text-xs text-ink3">{short(p.price)} تومان</span></span><span className="text-xs font-bold text-rose">خرید</span></Link></li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
