"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LogIn } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { actions, useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { durationDiscount, plans } from "@/lib/mock4";
import { dayInfo } from "@/lib/dates";
import { fa, toman } from "@/lib/fa";
import { tenantTone } from "@/lib/tones";

const Bar = ({ v, max, label }: { v: number; max: number; label: string }) => { const p = Math.min(100, Math.round((v / max) * 100)); return <div className="h-2 rounded-full bg-surface2" role="img" aria-label={`${label} ${p}٪`}><div className={`h-2 rounded-full ${p >= 90 ? "bg-danger" : p >= 70 ? "bg-amber" : "bg-sage"}`} style={{ width: `${p}%` }} /></div>; };

export function TenantDetail({ id }: { id: string }) {
  const db = useDB();
  const router = useRouter();
  const t = db.tenants.find((x) => x.id === id);
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (!t) return <div className="py-20 text-center text-ink2">تننت پیدا نشد. <Link href="/admin/tenants" className="font-bold text-rose">بازگشت</Link></div>;

  const plan = plans.find((p) => p.id === t.plan)!;
  const off = durationDiscount.find((d) => d.m === months)!.off;
  const amount = Math.round(plan.price * months * (1 - off / 100));
  const tickets = db.tickets.filter((x) => x.tenantId === t.id);
  const isMine = t.id === "t1";

  return (
    <>
      <Link href="/admin/tenants" className="mb-3 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />همه‌ی تننت‌ها</Link>
      <PageTitle title={t.name} sub={`${t.owner} · ${t.city} · ${t.phone} · عضو از ${t.since}`} actions={<Badge tone={tenantTone[t.status]} className="!px-3 !py-1 !text-xs">{t.status}</Badge>} />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Card>
            <CardHead title="پلن و مصرف" hint={`پلن ${plan.name} · پایان اشتراک: ${t.expiry}`} />
            <div className="space-y-4 px-5 pb-5 text-sm">
              <div><div className="mb-1 flex justify-between"><span>کاربران</span><b>{fa(t.users)} از {fa(plan.users)}</b></div><Bar v={t.users} max={plan.users} label="کاربران" /></div>
              <div><div className="mb-1 flex justify-between"><span>مشتریان</span><b>{fa(t.customers)} از {fa(plan.customers)}</b></div><Bar v={t.customers} max={plan.customers} label="مشتریان" /></div>
              {t.users / plan.users >= 0.9 || t.customers / plan.customers >= 0.9 ? <p className="rounded-xl bg-ambersoft p-3 text-xs text-amber">نزدیک سقف پلن است؛ فرصت پیشنهاد ارتقا.</p> : null}
              <p className="text-ink2">کیف پول (پورسانت فروشگاه): <b>{toman(t.wallet)}</b></p>
            </div>
          </Card>
          <Card>
            <CardHead title="تاریخچه‌ی پرداخت" />
            <ul className="divide-y divide-line">
              {t.payments.map((p, i) => <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="w-20 text-xs text-ink3">{p.day === 0 ? "امروز" : dayInfo(p.day).short}</span><span className="min-w-0 flex-1">{p.label}</span><b>{toman(p.amount)}</b></li>)}
              {!t.payments.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز پرداختی ثبت نشده است.</li>}
            </ul>
          </Card>
          <Card>
            <CardHead title="تیکت‌ها" />
            <ul className="divide-y divide-line">
              {tickets.map((k) => <li key={k.id}><Link href="/admin/tickets" className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-surface2"><span className="min-w-0 flex-1"><b className="block">{k.subject}</b><span className="text-xs text-ink3">{k.id} · {k.category}</span></span><Badge tone={k.status === "بسته" ? "neutral" : k.priority === "فوری" ? "danger" : "sky"}>{k.status}</Badge></Link></li>)}
              {!tickets.length && <li className="px-5 pb-6 text-center text-sm text-ink3">تیکتی ندارد.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="اقدام‌ها" />
            <div className="space-y-4 px-5 pb-5">
              <Field label="تمدید اشتراک">
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="مدت">{durationDiscount.map((d) => <button key={d.m} role="radio" aria-checked={months === d.m} onClick={() => setMonths(d.m)} className={`cursor-pointer rounded-lg border py-1.5 text-xs font-bold ${months === d.m ? "border-rose bg-rosesoft text-rosedeep" : "border-line"}`}>{fa(d.m)}م</button>)}</div>
              </Field>
              <Button className="w-full" onClick={() => { ops.extend(t.id, months, amount, `تمدید ${fa(months)} ماهه — ثبت دستی توسط ادمین`); setMsg(`تمدید ${fa(months)} ماهه (${toman(amount)}) ثبت شد.`); }}>تمدید و ثبت پرداخت {toman(amount)}</Button>
              <Field label="تغییر پلن"><select value={t.plan} onChange={(e) => { ops.saveTenant({ ...t, plan: e.target.value }); ops.addNote(t.id, `تغییر پلن به ${plans.find((p) => p.id === e.target.value)?.name}`); }} className={fieldCls}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {toman(p.price)}</option>)}</select></Field>
              <div className="flex gap-2">{t.status === "فعال" ? <Button variant="ghost" className="flex-1 !text-danger" onClick={() => { ops.saveTenant({ ...t, status: "تعلیق" }); ops.addNote(t.id, "تعلیق شد"); }}>تعلیق</Button> : <Button variant="soft" className="flex-1" onClick={() => { ops.saveTenant({ ...t, status: "فعال" }); ops.addNote(t.id, "فعال شد"); }}>فعال‌سازی</Button>}</div>
              {isMine ? <Button variant="ghost" className="w-full" onClick={() => { actions.login("owner", t.owner); router.push("/"); }}><LogIn size={14} />ورود به‌جای سالن</Button> : <p className="text-xs leading-6 text-ink3">«ورود به‌جای سالن» فقط برای سالنی که داده‌ی نمونه‌ی این مرورگر است فعال است.</p>}
              {msg && <p role="status" className="rounded-xl bg-sagesoft p-2.5 text-xs text-sage">{msg}</p>}
            </div>
          </Card>
          <Card>
            <CardHead title="یادداشت‌های داخلی" />
            <div className="space-y-3 px-5 pb-5">
              <form onSubmit={(e) => { e.preventDefault(); if (note.trim().length >= 3) { ops.addNote(t.id, note.trim()); setNote(""); } }} className="flex gap-2"><input aria-label="یادداشت جدید" value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت…" className={`${fieldCls} min-w-0 flex-1`} /><Button type="submit" variant="soft">ثبت</Button></form>
              <ul className="space-y-1.5 text-xs text-ink2">{t.notes.map((n, i) => <li key={i} className="rounded-lg bg-surface2 p-2.5">{n}</li>)}{!t.notes.length && <li className="text-ink3">یادداشتی ثبت نشده است.</li>}</ul>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
