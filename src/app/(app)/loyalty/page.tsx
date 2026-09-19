"use client";
import { useState } from "react";
import { Crown, Gift, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls, tierTone } from "@/components/ui";
import { useDB } from "@/lib/db";
import { growth } from "@/lib/growth";
import type { Loyalty, Reward } from "@/lib/seed-extra";
import { uid } from "@/lib/factories";
import { fa, num, short } from "@/lib/fa";

const kinds: { k: Reward["kind"]; l: string }[] = [{ k: "wallet", l: "اعتبار کیف پول" }, { k: "free", l: "خدمت رایگان" }, { k: "product", l: "محصول" }];

export default function LoyaltyPage() {
  const db = useDB();
  const [l, setL] = useState<Loyalty>(() => structuredClone(db.loyalty));
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [adj, setAdj] = useState<{ id: string; delta: string; note: string } | null>(null);

  const touch = (n: Loyalty) => { setL(n); setSaved(false); };
  const save = () => {
    const froms = l.tiers.map((t) => t.from);
    if (froms[0] !== 0 || froms.some((f, i) => i > 0 && f <= froms[i - 1])) return setErr("آستانه‌ی سطح‌ها باید از صفر شروع شود و صعودی باشد.");
    if (l.tiers.some((t) => t.off < 0 || t.off > 60)) return setErr("درصد تخفیف باید بین ۰ تا ۶۰ باشد.");
    if (l.rewards.some((r) => r.name.trim().length < 2 || r.cost <= 0 || r.value <= 0)) return setErr("نام، هزینه‌ی امتیاز و ارزش هر جایزه را کامل کنید.");
    growth.saveLoyalty(l); setErr(""); setSaved(true);
  };
  const members = db.customers.filter((c) => !q.trim() || c.name.includes(q.trim())).sort((a, b) => b.points - a.points);
  const byTier = db.loyalty.tiers.map((t) => ({ ...t, n: db.customers.filter((c) => c.tier === t.name).length }));
  const issued = db.customers.reduce((a, c) => a + c.points, 0);

  return (
    <>
      <PageTitle title="باشگاه مشتریان" sub="سطح‌ها، قوانین امتیاز و جایزه‌ها؛ تغییرات روی صندوق و پنل مشتری اثر می‌گذارد" actions={<><Button onClick={save}>ذخیره‌ی تنظیمات</Button>{saved && <span role="status" className="self-center text-sm font-bold text-sage">ذخیره شد ✓</span>}</>} />
      {err && <p role="alert" className="mb-4 rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعضای باشگاه" value={fa(db.customers.length)} tone="rose" icon={<Crown size={16} />} />
        <Stat label="مجموع امتیاز اعضا" value={num(issued)} tone="gold" icon={<Sparkles size={16} />} />
        {byTier.slice(-2).map((t) => <Stat key={t.name} label={`اعضای ${t.name}`} value={fa(t.n)} tone="sage" />)}
      </div>

      <Card className="mt-5">
        <CardHead title="سطح‌ها" hint="مشتری با جمع امتیاز خودکار ارتقا می‌یابد (خرج امتیاز باعث افت سطح نمی‌شود)" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {l.tiers.map((t, i) => (
            <div key={t.name} className="space-y-2 rounded-xl border border-line p-3">
              <Badge tone={tierTone[t.name]}><Crown size={11} />{t.name} <span className="mr-1 opacity-70">({fa(byTier[i].n)})</span></Badge>
              <Field label="از امتیاز"><input type="number" min={0} disabled={i === 0} value={t.from} onChange={(e) => touch({ ...l, tiers: l.tiers.map((x, j) => (j === i ? { ...x, from: +e.target.value || 0 } : x)) })} className={fieldCls} /></Field>
              <Field label="تخفیف خدمات (٪)"><input type="number" min={0} max={60} value={t.off} onChange={(e) => touch({ ...l, tiers: l.tiers.map((x, j) => (j === i ? { ...x, off: +e.target.value || 0 } : x)) })} className={fieldCls} /></Field>
              <Field label="مزایا"><input value={t.perks} onChange={(e) => touch({ ...l, tiers: l.tiers.map((x, j) => (j === i ? { ...x, perks: e.target.value } : x)) })} className={fieldCls} /></Field>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="کسب امتیاز" hint="مقدار امتیاز هر رویداد" />
          <ul className="divide-y divide-line">
            {l.earn.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0 flex-1">{e.label}</span>
                <input aria-label={e.label} type="number" min={0} value={e.pts} onChange={(ev) => touch({ ...l, earn: l.earn.map((x, j) => (j === i ? { ...x, pts: Math.max(0, +ev.target.value || 0) } : x)) })} className="w-20 rounded-lg border border-line px-2 py-1 text-center font-bold" />
                <span className="text-xs text-ink3">امتیاز</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHead title="جایزه‌ها" hint="مشتری با امتیاز، اعتبار کیف پول دریافت می‌کند" action={<Button variant="soft" onClick={() => touch({ ...l, rewards: [...l.rewards, { id: uid("w"), name: "", cost: 500, kind: "wallet", value: 50_000 }] })}><Plus size={14} />جایزه</Button>} />
          <ul className="divide-y divide-line">
            {l.rewards.map((r, i) => (
              <li key={r.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_auto]">
                <input aria-label="نام جایزه" placeholder="نام جایزه" value={r.name} onChange={(e) => touch({ ...l, rewards: l.rewards.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className={fieldCls} />
                <button aria-label={`حذف ${r.name}`} onClick={() => touch({ ...l, rewards: l.rewards.filter((_, j) => j !== i) })} className="cursor-pointer justify-self-end rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  <select aria-label="نوع" value={r.kind} onChange={(e) => touch({ ...l, rewards: l.rewards.map((x, j) => (j === i ? { ...x, kind: e.target.value as Reward["kind"] } : x)) })} className={fieldCls}>{kinds.map((k) => <option key={k.k} value={k.k}>{k.l}</option>)}</select>
                  <input aria-label="هزینه امتیاز" type="number" min={1} value={r.cost} onChange={(e) => touch({ ...l, rewards: l.rewards.map((x, j) => (j === i ? { ...x, cost: +e.target.value || 0 } : x)) })} className={fieldCls} placeholder="امتیاز" />
                  <input aria-label="ارزش (تومان)" type="number" min={1} step={10000} value={r.value} onChange={(e) => touch({ ...l, rewards: l.rewards.map((x, j) => (j === i ? { ...x, value: +e.target.value || 0 } : x)) })} className={fieldCls} placeholder="ارزش" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead title="اعضا" hint="تنظیم دستی امتیاز برای هدیه یا اصلاح" />
        <div className="px-5 pb-3"><label className="relative block max-w-sm"><Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی عضو" placeholder="جستجوی نام…" className={`${fieldCls} pr-9`} /></label></div>
        <ul className="divide-y divide-line border-t border-line">
          {members.slice(0, 12).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
              <Avatar name={c.name} size={34} />
              <span className="min-w-0 flex-1 basis-32"><b className="block text-sm">{c.name}</b><span className="text-xs text-ink3">کیف پول {short(c.wallet)}</span></span>
              <Badge tone={tierTone[c.tier]}>{c.tier}</Badge>
              <b className="w-20 text-left text-sm">{num(c.points)}</b>
              {adj?.id === c.id ? (
                <span className="flex flex-wrap items-center gap-1.5"><input aria-label="تغییر امتیاز" type="number" placeholder="±امتیاز" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} className={`${fieldCls} !w-24 !py-1.5`} /><input aria-label="دلیل" placeholder="دلیل" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} className={`${fieldCls} !w-32 !py-1.5`} /><Button variant="soft" onClick={() => { const n = +adj.delta; if (n) growth.adjustPoints(c.id, n, adj.note.trim()); setAdj(null); }}>ثبت</Button></span>
              ) : <Button variant="ghost" onClick={() => setAdj({ id: c.id, delta: "", note: "" })}><Gift size={13} />تنظیم امتیاز</Button>}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
