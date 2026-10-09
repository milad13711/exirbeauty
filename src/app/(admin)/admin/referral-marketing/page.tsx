"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { CATEGORIES } from "@/lib/storeApi";
import { addDays, faDate, faNum, todayLocal, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

function Board() {
  const rules = useQuery(crm.adminStoreRules, []);
  const boosts = useQuery(crm.adminBoosts, []);
  const top = useQuery(crm.adminReferrers, []);
  const [days, setDays] = useState<string>(""); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [nb, setNb] = useState({ name: "", extra: "3", category: "", from: todayLocal(), to: addDays(todayLocal(), 14) });
  async function run(fn: () => Promise<unknown>, ok: string) { setMsg(null); try { await fn(); setMsg({ ok: true, t: ok }); await Promise.all([rules.reload(), boosts.reload()]); } catch (e) { setMsg({ ok: false, t: errorText(e) }); } }
  if (rules.loading && !rules.data) return <Spinner />;
  if (!rules.data) return <ErrorNote message={errorText(rules.error)} onRetry={rules.reload} />;
  const current = days === "" ? rules.data.returnDays : Number(days);
  return (
    <>
      <PageTitle title="ریفرال مارکتینگ" sub="قوانین پورسانت فروشگاه، کمپین‌های پورسانت ویژه و برترین سالن‌های معرف" />
      {msg && <p role="status" className={`mb-4 rounded-xl p-3 text-sm ${msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{msg.t}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <CardHead title="قانون عمومی پورسانت" hint="برای سفارش‌هایی که از این پس تحویل می‌شوند و برای آزادسازی پورسانت‌های در انتظار اعمال می‌شود" />
          <Field label="مهلت مرجوعی تا آزادسازی پورسانت (روز)"><input type="number" min={0} max={30} value={days === "" ? rules.data.returnDays : days} onChange={(e) => setDays(e.target.value)} className={fieldCls} /></Field>
          <p className="text-xs leading-6 text-ink2">پورسانت {faNum(current)} روز پس از تحویل سفارش به کیف پول سالن معرف واریز می‌شود.</p>
          <Button disabled={days === "" || Number(days) === rules.data.returnDays} onClick={() => run(async () => { await crm.adminStoreRulesPut(Math.max(0, Math.min(30, Math.round(Number(days))))); setDays(""); }, "قانون ذخیره شد.")}>ذخیره</Button>
        </Card>
        <Card className="p-5">
          <CardHead title="پورسانت ویژه (کمپین)" hint="افزایش موقت پورسانت؛ هنگام ثبت سفارش در خود سفارش ثبت می‌شود" />
          {boosts.data?.length ? (
            <ul className="divide-y divide-line text-sm">
              {boosts.data.map((b) => <li key={b.id} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1"><b>{b.name}</b> <Badge tone="gold">+{faNum(b.extraPct)}٪</Badge><span className="block text-xs text-ink3">{b.category ?? "همه‌ی محصولات"} · {faDate.short(b.startsOn)} تا {faDate.short(b.endsOn)}</span></span><Toggle on={b.active} label={`فعال بودن ${b.name}`} onChange={(v) => run(() => crm.adminBoostActive(b.id, v), "کمپین به‌روز شد.")} /></li>)}
            </ul>
          ) : <p className="text-sm text-ink3">کمپینی تعریف نشده است.</p>}
          <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
            <input className={fieldCls} placeholder="نام کمپین" value={nb.name} onChange={(e) => setNb({ ...nb, name: e.target.value })} />
            <input dir="ltr" inputMode="numeric" className={fieldCls} placeholder="درصد اضافه" value={nb.extra} onChange={(e) => setNb({ ...nb, extra: e.target.value })} />
            <select className={fieldCls} value={nb.category} onChange={(e) => setNb({ ...nb, category: e.target.value })}><option value="">همه‌ی محصولات</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <div className="flex gap-2"><input type="date" dir="ltr" className={fieldCls} value={nb.from} onChange={(e) => setNb({ ...nb, from: e.target.value })} /><input type="date" dir="ltr" className={fieldCls} value={nb.to} onChange={(e) => setNb({ ...nb, to: e.target.value })} /></div>
            <Button className="sm:col-span-2" disabled={nb.name.trim().length < 3 || !Number(nb.extra)} onClick={() => run(async () => { await crm.adminBoostCreate({ name: nb.name.trim(), extraPct: Math.min(30, Math.round(Number(nb.extra))), category: nb.category || null, startsOn: nb.from, endsOn: nb.to }); setNb({ ...nb, name: "" }); }, "کمپین ثبت شد.")}><Plus size={14} />کمپین جدید</Button>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <CardHead title="برترین معرف‌ها" />
          {!top.data?.length ? <p className="text-sm text-ink3">هنوز سفارشی از لینک سالنی ثبت نشده است.</p> : (
            <ul className="divide-y divide-line text-sm">{top.data.slice(0, 8).map((s, i) => <li key={s.tenantId} className="flex flex-wrap items-center gap-3 py-3"><span className="w-4 text-xs font-bold text-ink3">{faNum(i + 1)}</span><span className="min-w-0 flex-1"><b>{s.name}</b><span className="block text-xs text-ink3">{faNum(s.orders)} سفارش</span></span><b>{toman(s.sales)}</b></li>)}</ul>
          )}
        </Card>
      </div>
    </>
  );
}

export default function ReferralMarketing() { return <AdminGate><Board /></AdminGate>; }
