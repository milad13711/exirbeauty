"use client";
import { useState } from "react";
import { Crown } from "lucide-react";
import { Badge, Button, Card, CardHead, tierTone } from "@/components/ui";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { portal } from "@/lib/portalApi";
import { faDate, faNum, shortToman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

export default function Rewards() {
  const q = useQuery(portal.rewards, []);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState("");
  async function redeem(id: string) {
    setMsg(null); setBusy(id);
    try { const r = await portal.redeem(id); setMsg({ ok: true, t: `اعتبار به کیف پول شما اضافه شد (موجودی: ${faNum(r.wallet)} تومان).` }); await q.reload(); } catch (e) { setMsg({ ok: false, t: errorText(e) }); } finally { setBusy(""); }
  }
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const c = q.data;
  const tier = c.tiers.find((t) => t.name === c.tier);
  const nt = [...c.tiers].sort((a, b) => a.from - b.from).find((t) => t.from > c.lifetime);
  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-plum p-5 text-white">
          <div className="flex items-center justify-between"><p className="text-xs text-white/60">امتیاز من</p><Badge tone={tierTone[c.tier] ?? "neutral"}><Crown size={11} />{c.tier}</Badge></div>
          <p className="mt-1 text-4xl font-extrabold">{faNum(c.points)}</p>
          {nt ? <><div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-gold" style={{ width: `${Math.min(100, Math.round((c.lifetime / nt.from) * 100))}%` }} /></div><p className="mt-1.5 text-xs text-white/65">{faNum(nt.from - c.lifetime)} امتیاز تا سطح {nt.name}</p></> : <p className="mt-2 text-xs text-white/65">شما در بالاترین سطح هستید 🎉</p>}
        </div>
        <div className="space-y-1 p-4 text-sm"><p className="text-xs font-bold text-ink3">مزایای سطح {c.tier}</p><p>{tier?.perks}</p>{tier && tier.off > 0 && <p className="text-sage">{faNum(tier.off)}٪ تخفیف روی خدمات</p>}</div>
      </Card>
      {msg && <p role="status" className={`rounded-xl p-3 text-sm ${msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{msg.t}</p>}
      <Card>
        <CardHead title="جایزه‌ها" hint={c.next.left > 0 ? `${faNum(c.next.left)} امتیاز تا هدف بعدی` : undefined} />
        <ul className="divide-y divide-line">
          {[...c.rewards].sort((a, b) => a.cost - b.cost).map((r) => {
            const can = c.points >= r.cost;
            return (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1"><b className="block text-sm">{r.name}</b><span className="text-xs text-ink3">ارزش {shortToman(r.value)} تومان · {faNum(r.cost)} امتیاز{r.kind !== "wallet" ? " · در سالن تحویل می‌شود" : ""}</span></div>
                {r.kind === "wallet" ? <Button variant={can ? "primary" : "ghost"} disabled={!can || busy === r.id} onClick={() => redeem(r.id)}>دریافت</Button> : <Badge tone={can ? "sage" : "neutral"}>{can ? "قابل دریافت در سالن" : "امتیاز کافی نیست"}</Badge>}
              </li>
            );
          })}
          {!c.rewards.length && <li className="px-5 pb-6 text-center text-sm text-ink3">فعلاً جایزه‌ای تعریف نشده است.</li>}
        </ul>
      </Card>
      <Card>
        <CardHead title="تاریخچه‌ی امتیاز" />
        <ul className="divide-y divide-line">
          {c.log.filter((l) => l.points !== 0).map((l) => <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="min-w-0 flex-1"><b className="block">{l.note || "امتیاز"}</b><span className="text-xs text-ink3">{faDate.short(l.createdAt.slice(0, 10))}</span></span><b className={l.points > 0 ? "text-sage" : "text-danger"}>{l.points > 0 ? "+" : "−"}{faNum(Math.abs(l.points))}</b></li>)}
          {!c.log.some((l) => l.points !== 0) && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز امتیازی ثبت نشده است.</li>}
        </ul>
      </Card>
    </>
  );
}
