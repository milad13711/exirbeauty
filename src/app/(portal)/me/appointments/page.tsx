"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Camera } from "lucide-react";
import { Badge, Card, CardHead, type Tone } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { useDB, type LogEntry } from "@/lib/db";
import { dayInfo } from "@/lib/dates";
import { clock } from "@/lib/booking";
import { hoursUntil, portal } from "@/lib/portal";
import { fa, short } from "@/lib/fa";

const st: Record<string, { l: string; t: Tone }> = { confirmed: { l: "تأییدشده", t: "sage" }, pending: { l: "منتظر تأیید", t: "amber" }, inservice: { l: "در حال انجام", t: "rose" }, done: { l: "انجام‌شده", t: "neutral" } };

function Photos({ e }: { e: LogEntry }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {(["قبل", "بعد"] as const).map((t, i) => { const src = i ? e.after : e.before; return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <div key={t} className="relative aspect-[4/5] overflow-hidden rounded-xl"><img src={src} alt={`${t} از ${e.s}`} className="size-full object-cover" /><span className="absolute bottom-2 right-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold">{t}</span></div>
      ) : <div key={t} className="grid aspect-[4/5] place-items-center rounded-xl bg-surface2 text-ink3"><Camera size={20} /></div>; })}
    </div>
  );
}

export default function MyAppointments() {
  const db = useDB();
  const me = useMe();
  const [tab, setTab] = useState<"up" | "past">("up");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  if (!me) return null;
  const up = db.appts.filter((a) => a.customerId === me.id && a.status !== "done").sort((a, b) => a.day - b.day || a.start - b.start);

  return (
    <>
      <h1 className="text-lg font-extrabold">نوبت‌های من</h1>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1" role="tablist">
        {([["up", `پیش‌رو (${fa(up.length)})`], ["past", "سوابق خدمات"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("cursor-pointer rounded-lg py-2 text-[13px] font-bold", tab === k ? "bg-surface text-rosedeep shadow-sm" : "text-ink2")}>{l}</button>)}
      </div>
      {msg && <p role="status" className={clsx("rounded-xl p-3 text-sm", msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{msg.t}</p>}

      {tab === "up" && (
        <>
          {up.map((a) => {
            const can = hoursUntil(a) >= db.salon.online.cancelHours;
            const s = st[a.status];
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between"><b className="text-sm">{a.service}</b><Badge tone={s.t}>{s.l}</Badge></div>
                <p className="mt-1 text-sm text-ink2">{dayInfo(a.day).full} · {clock(a.start)}</p>
                <p className="text-xs text-ink3">{db.staff.find((x) => x.id === a.staffId)?.name}</p>
                <div className="mt-3 flex gap-2">
                  {can ? <Link href={`/book?move=${a.id}`} className="flex-1 rounded-xl border border-line py-2 text-center text-[13px] font-semibold text-ink2">جابه‌جایی</Link> : null}
                  <button onClick={() => { const r = portal.cancel(a.id, me.id); setMsg({ ok: r.ok, t: r.msg }); }} className="flex-1 cursor-pointer rounded-xl border border-danger/30 py-2 text-[13px] font-semibold text-danger">لغو نوبت</button>
                </div>
                {!can && <p className="mt-2 text-[11px] leading-5 text-ink3">جابه‌جایی و لغو آنلاین فقط تا {fa(db.salon.online.cancelHours)} ساعت قبل از نوبت ممکن است.</p>}
              </Card>
            );
          })}
          {!up.length && <Card className="p-6 text-center"><p className="text-sm text-ink2">نوبت پیش‌رویی ندارید.</p><Link href="/book" className="mt-3 inline-block rounded-xl bg-rose px-5 py-2.5 text-[13px] font-bold text-white">رزرو نوبت</Link></Card>}
        </>
      )}

      {tab === "past" && (
        <Card>
          <CardHead title="خدمات انجام‌شده" hint="هر ویزیت با نتیجه" />
          <ul className="divide-y divide-line">
            {me.log.map((l) => <li key={l.id} className="px-5 py-4"><div className="flex items-center justify-between text-sm"><b>{l.s}</b><span>{short(l.price)}</span></div><p className="text-xs text-ink3">{l.d} · {l.by}</p>{(l.before || l.after) && <Photos e={l} />}</li>)}
            {!me.log.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز خدمتی ثبت نشده است.</li>}
          </ul>
        </Card>
      )}
    </>
  );
}
