"use client";
import Link from "next/link";
import { CalendarClock, Star, TrendingUp, Users } from "lucide-react";
import { Badge, Card, CardHead } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMeStaff } from "@/components/staff/StaffShell";
import { useDB } from "@/lib/db";
import { walletOf } from "@/lib/settle";
import { clock } from "@/lib/booking";
import { fa, short, toman } from "@/lib/fa";

const stTone = { confirmed: "sage", pending: "amber", inservice: "rose", done: "neutral" } as const;
const stText = { confirmed: "تأیید شده", pending: "در انتظار تأیید", inservice: "در حال انجام", done: "انجام شد" } as const;

export default function MyHome() {
  const db = useDB();
  const me = useMeStaff();
  if (!me) return null;
  const w = walletOf(db, me.id);
  const today = db.appts.filter((a) => a.day === 0 && a.staffId === me.id).sort((a, b) => a.start - b.start);
  const left = today.filter((a) => a.status !== "done").length;
  return (
    <>
      <div><p className="text-xl font-extrabold">سلام {me.name.split(" ")[0]} 👋</p><p className="text-sm text-ink2">{left ? `امروز ${fa(left)} نوبت پیش رو دارید` : "امروز نوبت باقی‌مانده‌ای ندارید"}</p></div>

      <Link href="/my/wallet" className="press relative block overflow-hidden rounded-[26px] bg-[image:var(--grad-plum)] p-5 text-white shadow-[var(--shadow-pop)]">
        <span className="pointer-events-none absolute -bottom-16 -right-10 size-48 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.4),transparent_65%)]" aria-hidden />
        <p className="relative text-xs text-white/65">کیف پول شما · قابل برداشت</p>
        <p className="font-num relative mt-1 text-[32px] font-extrabold leading-tight">{short(w.available)} <span className="text-sm font-semibold text-white/60">تومان</span></p>
        <p className="relative mt-2 text-xs text-[#e6c88e]">{w.pending ? `${toman(w.pending)} در انتظار تسویه` : "درخواست تسویه از مدیر سالن ←"}</p>
      </Link>

      <div className="grid grid-cols-3 gap-2">
        {[{ I: TrendingUp, l: "فروش شما", v: short(me.revenue) }, { I: Users, l: "مشتری", v: fa(me.clients) }, { I: Star, l: "رضایت", v: fa(me.rating) }].map(({ I, l, v }) => (
          <div key={l} className="rounded-[20px] border border-line/80 bg-surface p-3 text-center shadow-[var(--shadow-card)]"><span className="mx-auto grid size-9 place-items-center rounded-xl bg-rosesoft text-rose"><I size={17} /></span><p className="font-num mt-1.5 text-[15px] font-extrabold">{v}</p><p className="text-[10.5px] text-ink3">{l}</p></div>
        ))}
      </div>

      <Card>
        <CardHead title="نوبت‌های امروز" action={<Link href="/my/appointments" className="text-xs font-bold text-rose">همه ←</Link>} />
        <ul className="divide-y divide-line">
          {today.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rosesoft text-[13px] font-extrabold text-rosedeep">{clock(a.start)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{a.client}</b><span className="text-xs text-ink3">{a.service}</span></span><Badge tone={stTone[a.status]}>{stText[a.status]}</Badge></li>
          ))}
          {!today.length && <li className="flex items-center gap-2 px-5 py-8 text-sm text-ink3"><CalendarClock size={16} />نوبتی برای امروز ثبت نشده است.</li>}
        </ul>
      </Card>
      <ThemeToggle compact />
    </>
  );
}
