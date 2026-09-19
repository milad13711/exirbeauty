"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check, Crown } from "lucide-react";
import { Badge, Button, Card, CardHead, tierTone } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { useDB } from "@/lib/db";
import { portal } from "@/lib/portal";
import { nextGoal } from "@/lib/sales";
import { fa, num, short } from "@/lib/fa";

export default function Rewards() {
  const db = useDB();
  const me = useMe();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  if (!me) return null;
  const tier = db.loyalty.tiers.find((t) => t.name === me.tier);
  const nt = [...db.loyalty.tiers].sort((a, b) => a.from - b.from).find((t) => t.from > me.points);
  const goal = nextGoal(db.loyalty, me.points);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-plum p-5 text-white">
          <div className="flex items-center justify-between"><p className="text-xs text-white/60">امتیاز من</p><Badge tone={tierTone[me.tier]}><Crown size={11} />{me.tier}</Badge></div>
          <p className="mt-1 text-4xl font-extrabold">{num(me.points)}</p>
          {nt ? <><div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-gold" style={{ width: `${Math.min(100, Math.round((me.points / nt.from) * 100))}%` }} /></div><p className="mt-1.5 text-xs text-white/65">{fa(nt.from - me.points)} امتیاز تا سطح {nt.name}</p></> : <p className="mt-2 text-xs text-white/65">شما در بالاترین سطح هستید 🎉</p>}
        </div>
        <div className="space-y-1 p-4 text-sm"><p className="text-xs font-bold text-ink3">مزایای سطح {me.tier}</p><p>{tier?.perks}</p>{tier && tier.off > 0 && <p className="text-sage">{fa(tier.off)}٪ تخفیف روی همه‌ی خدمات</p>}</div>
      </Card>

      {msg && <p role="status" className={clsx("rounded-xl p-3 text-sm", msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{msg.t}</p>}

      <Card>
        <CardHead title="جایزه‌ها" hint={goal.left > 0 ? `${fa(goal.left)} امتیاز تا هدف بعدی` : undefined} />
        <ul className="divide-y divide-line">
          {[...db.loyalty.rewards].sort((a, b) => a.cost - b.cost).map((r) => {
            const can = me.points >= r.cost;
            return (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1"><b className="block text-sm">{r.name}</b><span className="text-xs text-ink3">ارزش {short(r.value)} تومان · {num(r.cost)} امتیاز</span></div>
                <Button variant={can ? "primary" : "ghost"} disabled={!can} onClick={() => { const x = portal.redeem(me.id, r.id); setMsg({ ok: x.ok, t: x.msg }); }}>دریافت</Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHead title="چطور امتیاز بگیرم؟" />
        <ul className="divide-y divide-line">{db.loyalty.earn.map((e) => <li key={e.id} className="flex items-center gap-2 px-5 py-2.5 text-sm"><Check size={14} className="text-sage" /><span className="flex-1">{e.label}</span><b>{fa(e.pts)}</b></li>)}</ul>
      </Card>

      <Card>
        <CardHead title="تاریخچه‌ی امتیاز" />
        <ul className="divide-y divide-line">
          {me.ptsLog.map((p, i) => <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="min-w-0 flex-1"><b className="block">{p.note}</b><span className="text-xs text-ink3">{p.d}</span></span><b className={p.delta > 0 ? "text-sage" : "text-danger"}>{p.delta > 0 ? "+" : "−"}{fa(Math.abs(p.delta))}</b></li>)}
          {!me.ptsLog.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز امتیازی ثبت نشده است.</li>}
        </ul>
      </Card>
    </>
  );
}
