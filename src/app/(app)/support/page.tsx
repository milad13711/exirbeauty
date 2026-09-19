"use client";
import { useState } from "react";
import clsx from "clsx";
import { LifeBuoy, Plus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { StatusBadge, TicketThread } from "@/components/TicketThread";
import { useDB } from "@/lib/db";
import { ops } from "@/lib/ops";

const cats = ["فنی", "مالی", "آموزش", "پیشنهاد"];
const TENANT = "t1"; // سالنِ همین مرورگر

export default function Support() {
  const db = useDB();
  const mine = db.tickets.filter((t) => t.tenantId === TENANT);
  const [sel, setSel] = useState<string | null>(mine[0]?.id ?? null);
  const [form, setForm] = useState<{ subject: string; category: string; priority: "عادی" | "فوری"; text: string } | null>(null);
  const [err, setErr] = useState("");
  const cur = mine.find((t) => t.id === sel);
  const who = db.session?.name ?? db.users[0]?.name ?? "مدیر سالن";

  return (
    <>
      <PageTitle title="پشتیبانی" sub="سؤال یا مشکلی دارید؟ تیکت بسازید؛ تیم اکسیر پاسخ می‌دهد" actions={<Button onClick={() => { setForm({ subject: "", category: cats[0], priority: "عادی", text: "" }); setErr(""); }}><Plus size={14} />تیکت جدید</Button>} />
      {form && (
        <Card className="mb-5">
          <CardHead title="تیکت جدید" />
          <form onSubmit={(e) => { e.preventDefault(); if (form.subject.trim().length < 5) return setErr("موضوع را کامل بنویسید."); if (form.text.trim().length < 10) return setErr("توضیح مشکل را کامل‌تر بنویسید."); const id = ops.createTicket({ ...form, subject: form.subject.trim(), text: form.text.trim(), tenantId: TENANT, name: who }); setSel(id); setForm(null); setErr(""); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="موضوع"><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={fieldCls} /></Field></div>
            <Field label="دسته"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={fieldCls}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="اولویت"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "عادی" | "فوری" })} className={fieldCls}><option>عادی</option><option>فوری</option></select></Field>
            <div className="sm:col-span-2"><Field label="توضیح"><textarea rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className={fieldCls} /></Field></div>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
            <div className="flex gap-2 sm:col-span-2"><Button type="submit">ارسال تیکت</Button><Button type="button" variant="ghost" onClick={() => setForm(null)}>انصراف</Button></div>
          </form>
        </Card>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHead title="تیکت‌های من" />
          <ul className="divide-y divide-line">
            {mine.map((t) => <li key={t.id}><button onClick={() => setSel(t.id)} className={clsx("flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-right", sel === t.id ? "bg-rosesoft" : "hover:bg-surface2")}><span className="min-w-0 flex-1"><b className="block truncate text-sm">{t.subject}</b><span className="text-xs text-ink3">{t.id} · {t.category}</span></span>{t.priority === "فوری" && <Badge tone="danger">فوری</Badge>}<StatusBadge s={t.status} /></button></li>)}
            {!mine.length && <li className="grid place-items-center gap-2 px-5 py-10 text-sm text-ink3"><LifeBuoy size={26} />هنوز تیکتی ندارید.</li>}
          </ul>
        </Card>
        {cur ? <Card className="p-5"><div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="min-w-0 flex-1 font-bold">{cur.subject}</h2><StatusBadge s={cur.status} /></div><TicketThread t={cur} as="salon" name={who} /></Card> : <Card className="grid place-items-center p-10 text-sm text-ink3">یک تیکت را انتخاب کنید.</Card>}
      </div>
    </>
  );
}
