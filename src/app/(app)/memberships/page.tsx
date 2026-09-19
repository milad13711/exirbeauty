"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check, Crown, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { growth } from "@/lib/growth";
import type { MembershipPlan, PayMethod } from "@/lib/seed-extra";
import { uid } from "@/lib/factories";
import { fa, short, toman } from "@/lib/fa";

const blank = (): MembershipPlan => ({ id: uid("mp"), name: "", price: 0, months: 1, credits: 1, creditLabel: "", perks: [], active: true });

export default function Memberships() {
  const db = useDB();
  const [edit, setEdit] = useState<MembershipPlan | null>(null);
  const [perks, setPerks] = useState("");
  const [err, setErr] = useState("");
  const [sell, setSell] = useState({ customerId: "", planId: "", method: "کارت" as PayMethod });
  const [res, setRes] = useState<{ ok: boolean; t: string } | null>(null);
  const active = db.memberships.filter((m) => m.expiry > 0);
  const mrr = db.memberships.filter((m) => m.status === "فعال").reduce((a, m) => a + (db.memPlans.find((p) => p.id === m.planId)?.price ?? 0) / (db.memPlans.find((p) => p.id === m.planId)?.months || 1), 0);
  const isNew = edit && !db.memPlans.some((p) => p.id === edit.id);

  return (
    <>
      <PageTitle title="پکیج و عضویت" sub="درآمد تکرارشونده برای سالن؛ فروش عضویت در صندوق ثبت می‌شود" actions={<Button onClick={() => { setEdit(blank()); setPerks(""); setErr(""); }}><Plus size={14} />پلن جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعضای فعال" value={fa(db.memberships.filter((m) => m.status === "فعال").length)} tone="rose" icon={<Crown size={16} />} />
        <Stat label="درآمد ماهانه‌ی تکرارشونده" value={short(mrr)} tone="sage" icon={<RefreshCw size={16} />} />
        <Stat label="پلن‌های فعال" value={fa(db.memPlans.filter((p) => p.active).length)} tone="gold" />
        <Stat label="جلسه‌های باقی‌مانده" value={fa(active.reduce((a, m) => a + m.credits, 0))} tone="sky" />
      </div>

      {edit && (
        <Card className="mt-5">
          <CardHead title={isNew ? "پلن جدید" : "ویرایش پلن"} />
          <form onSubmit={(e) => { e.preventDefault(); if (edit.name.trim().length < 3) return setErr("نام پلن را وارد کنید."); if (edit.price <= 0) return setErr("قیمت باید بیشتر از صفر باشد."); growth.savePlan({ ...edit, name: edit.name.trim(), perks: perks.split("\n").map((x) => x.trim()).filter(Boolean) }); setEdit(null); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="نام پلن"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={fieldCls} /></Field>
            <Field label="قیمت (تومان)"><input type="number" min={0} step={10000} value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value || 0 })} className={fieldCls} /></Field>
            <Field label="مدت (ماه)"><input type="number" min={1} max={12} value={edit.months} onChange={(e) => setEdit({ ...edit, months: Math.max(1, +e.target.value || 1) })} className={fieldCls} /></Field>
            <Field label="جلسه‌ی همراه"><input type="number" min={0} value={edit.credits} onChange={(e) => setEdit({ ...edit, credits: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>
            <Field label="عنوان جلسه (مثلاً فیشال)"><input value={edit.creditLabel} onChange={(e) => setEdit({ ...edit, creditLabel: e.target.value })} className={fieldCls} /></Field>
            <div className="sm:col-span-2 lg:col-span-3"><Field label="مزایا (هر مورد در یک خط)"><textarea rows={3} value={perks} onChange={(e) => setPerks(e.target.value)} className={fieldCls} /></Field></div>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2 lg:col-span-4">{err}</p>}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => setEdit(null)}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {db.memPlans.map((p) => (
          <Card key={p.id} className={clsx(!p.active && "opacity-55")}>
            <div className="p-5">
              <div className="flex items-center justify-between"><h3 className="font-bold">{p.name}</h3><Toggle on={p.active} label={`فعال بودن ${p.name}`} onChange={(v) => growth.savePlan({ ...p, active: v })} /></div>
              <p className="mt-3 text-2xl font-extrabold">{short(p.price)} <span className="text-xs font-medium text-ink3">تومان / {fa(p.months)} ماه</span></p>
              <ul className="mt-4 space-y-2 text-sm">{p.credits > 0 && <li className="flex items-center gap-2"><Check size={15} className="text-sage" /><b>{fa(p.credits)} جلسه {p.creditLabel}</b></li>}{p.perks.map((x) => <li key={x} className="flex items-center gap-2"><Check size={15} className="text-sage" />{x}</li>)}</ul>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3"><span className="text-xs text-ink3">{fa(db.memberships.filter((m) => m.planId === p.id && m.status === "فعال").length)} عضو فعال</span><span className="flex gap-1"><button aria-label={`ویرایش ${p.name}`} onClick={() => { setEdit({ ...p }); setPerks(p.perks.join("\n")); setErr(""); }} className="cursor-pointer rounded-lg p-2 hover:bg-surface2"><Pencil size={15} /></button><button aria-label={`حذف ${p.name}`} onClick={() => growth.deletePlan(p.id)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button></span></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="فروش عضویت" hint="فاکتور در صندوق ثبت می‌شود" />
          <div className="space-y-3 px-5 pb-5">
            <Field label="مشتری"><select value={sell.customerId} onChange={(e) => setSell({ ...sell, customerId: e.target.value })} className={fieldCls}><option value="">انتخاب مشتری…</option>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="پلن"><select value={sell.planId} onChange={(e) => setSell({ ...sell, planId: e.target.value })} className={fieldCls}><option value="">انتخاب پلن…</option>{db.memPlans.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} · {short(p.price)}</option>)}</select></Field>
            <Field label="روش پرداخت"><select value={sell.method} onChange={(e) => setSell({ ...sell, method: e.target.value as PayMethod })} className={fieldCls}>{(["کارت", "نقدی", "آنلاین", "کیف پول"] as PayMethod[]).map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Button disabled={!sell.customerId || !sell.planId} onClick={() => { const r = growth.sellMembership(sell.customerId, sell.planId, sell.method); setRes({ ok: r.ok, t: r.msg }); }}>فروش و صدور فاکتور</Button>
            {res && <p role="status" className={clsx("rounded-xl p-2.5 text-sm", res.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{res.t}</p>}
          </div>
        </Card>
        <Card>
          <CardHead title="اعضا" />
          <ul className="divide-y divide-line">
            {db.memberships.map((m) => {
              const p = db.memPlans.find((x) => x.id === m.planId); const c = db.customers.find((x) => x.id === m.customerId);
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-32"><b className="block">{c?.name}</b><span className="text-xs text-ink3">{p?.name} · {fa(m.expiry)} روز اعتبار</span></span>
                  <Badge tone={m.credits > 0 ? "sage" : "neutral"}>{fa(m.credits)} جلسه مانده</Badge>
                  <Button variant="soft" disabled={m.credits <= 0} onClick={() => growth.useCredit(m.id)}>مصرف جلسه</Button>
                </li>
              );
            })}
            {!db.memberships.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز عضویتی فروخته نشده است. مجموع درآمد: {toman(0)}</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
