"use client";
import { Badge, Card } from "@/components/ui";
import { useMeStaff } from "@/components/staff/StaffShell";
import { useDB } from "@/lib/db";
import { dayInfo } from "@/lib/dates";
import { clock } from "@/lib/booking";
import { fa } from "@/lib/fa";

const stTone = { confirmed: "sage", pending: "amber", inservice: "rose", done: "neutral" } as const;
const stText = { confirmed: "تأیید شده", pending: "در انتظار", inservice: "در حال انجام", done: "انجام شد" } as const;

export default function MyAppointments() {
  const db = useDB();
  const me = useMeStaff();
  if (!me) return null;
  const mine = db.appts.filter((a) => a.staffId === me.id && a.day >= 0 && a.day <= 7).sort((a, b) => a.day - b.day || a.start - b.start);
  const days = [...new Set(mine.map((a) => a.day))];
  return (
    <>
      <h1 className="text-xl font-extrabold">نوبت‌های من</h1>
      {days.map((d) => (
        <Card key={d}>
          <p className="border-b border-line px-5 py-3 text-[13px] font-extrabold">{d === 0 ? "امروز" : dayInfo(d).full}<span className="mr-2 text-xs font-medium text-ink3">{fa(mine.filter((a) => a.day === d).length)} نوبت</span></p>
          <ul className="divide-y divide-line">{mine.filter((a) => a.day === d).map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-rosesoft text-[13px] font-extrabold text-rosedeep">{clock(a.start)}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{a.client}</b><span className="text-xs text-ink3">{a.service} · {fa(a.dur)} دقیقه</span></span><Badge tone={stTone[a.status]}>{stText[a.status]}</Badge></li>
          ))}</ul>
        </Card>
      ))}
      {!days.length && <Card className="p-8 text-center text-sm text-ink3">در ۷ روز آینده نوبتی ندارید.</Card>}
    </>
  );
}
