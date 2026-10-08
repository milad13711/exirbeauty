"use client";
import Link from "next/link";
import { CalendarClock, Gift, UserPlus } from "lucide-react";
import { Badge, Card, tierTone } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { Spinner } from "@/components/live/ui";
import { portal } from "@/lib/portalApi";
import { faDate, faNum, fmtMin, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function MeHome() {
  const me = useMe();
  const appts = useQuery(() => (me.features.booking ? portal.appointments() : Promise.resolve(null)), [me.features.booking]);
  const club = useQuery(() => (me.features.loyalty ? portal.rewards() : Promise.resolve(null)), [me.features.loyalty]);
  const next = appts.data?.items.filter((a) => a.upcoming).sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)[0];
  const c = club.data;
  const pct = c ? Math.min(100, Math.round((c.points / (c.points + c.next.left || 1)) * 100)) : 0;

  return (
    <>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xl font-extrabold">سلام {me.name.split(" ")[0]} 👋</p><p className="text-sm text-ink2">به پنل مشتری {me.salon.name} خوش آمدید</p></div><div className="w-28 shrink-0"><ThemeToggle iconOnly compact /></div></div>

      {me.features.booking && (appts.loading && !appts.data ? <Spinner /> : next ? (
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden bg-[image:var(--grad-rose)] p-5 text-white"><span className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-white/15" aria-hidden />
            <p className="flex items-center gap-1.5 text-xs text-white/75"><CalendarClock size={14} />نوبت بعدی شما</p>
            <p className="mt-1 text-xl font-extrabold">{faDate.weekday(next.date)}، ساعت {fmtMin(next.startMin)}</p>
            <p className="text-sm text-white/85">{next.serviceName} · {next.staffName}</p>
            <p className="mt-1 text-xs text-white/70">{faDate.full(next.date)}</p>
          </div>
          <div className="flex gap-2 p-3"><Link href="/me/appointments" className="press flex-1 rounded-[14px] border border-line py-3 text-center text-[13px] font-bold text-ink2">مدیریت نوبت</Link><Link href={`/s/${me.salon.slug}`} className="press flex-1 rounded-[14px] bg-rosesoft py-3 text-center text-[13px] font-bold text-rosedeep">نوبت جدید</Link></div>
        </Card>
      ) : (
        <Card className="p-5 text-center"><p className="text-sm text-ink2">نوبت فعالی ندارید.</p><Link href={`/s/${me.salon.slug}`} className="press mt-3 inline-flex min-h-11 items-center rounded-[14px] bg-[image:var(--grad-rose)] px-6 text-[13px] font-bold text-white">رزرو نوبت</Link></Card>
      ))}

      {c && (
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden bg-[image:var(--grad-plum)] p-5 text-white"><span className="pointer-events-none absolute -bottom-16 -right-10 size-44 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.35),transparent_65%)]" aria-hidden />
            <div className="flex items-center justify-between"><p className="text-xs text-white/60">مزایای من در این سالن</p><Badge tone={tierTone[c.tier] ?? "neutral"}>{c.tier}</Badge></div>
            <p className="mt-1 text-3xl font-extrabold">{faNum(c.points)} <span className="text-sm font-medium text-white/60">امتیاز</span></p>
            <div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-[image:var(--grad-gold)]" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1.5 text-xs text-white/65">{c.next.left > 0 ? `${faNum(c.next.left)} امتیاز تا ${c.next.label}` : c.next.label}</p>
          </div>
          <Link href="/me/rewards" className="block p-3 text-center text-[13px] font-semibold text-rose">دیدن جایزه‌ها ←</Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        {me.features.loyalty && c && <Link href="/me/wallet" className="press rounded-[20px] border border-line/80 bg-surface p-3 text-center shadow-[var(--shadow-card)]"><span className="mx-auto grid size-10 place-items-center rounded-2xl bg-rosesoft text-rose"><Gift size={19} /></span><p className="mt-1.5 text-[12px] font-bold leading-tight">{toman(c.wallet).replace(" تومان", "")}</p><p className="text-[10px] text-ink3">اعتبار کیف پول</p></Link>}
        {me.features.referral && <Link href="/me/invite" className="press rounded-[20px] border border-line/80 bg-surface p-3 text-center shadow-[var(--shadow-card)]"><span className="mx-auto grid size-10 place-items-center rounded-2xl bg-rosesoft text-rose"><UserPlus size={19} /></span><p className="mt-1.5 text-[12px] font-bold leading-tight">معرفی دوستان</p></Link>}
      </div>

      <Card className="p-5">
        <p className="mb-2 text-sm font-bold">نصب اپ روی گوشی</p>
        <InstallPrompt />
      </Card>
    </>
  );
}
