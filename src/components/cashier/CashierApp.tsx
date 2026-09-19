"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Ban, CheckCircle2, ChevronDown, Lock, LockOpen, Plus, Receipt, Trash2, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls, type Tone } from "@/components/ui";
import { PosForm } from "./PosForm";
import { useDB } from "@/lib/db";
import { daySummary, sales } from "@/lib/sales";
import type { Sale } from "@/lib/seed-extra";
import { fa, short, toman } from "@/lib/fa";

const tabs = ["امروز", "فاکتور جدید", "هزینه‌ها", "بدهی‌ها", "بستن روز"] as const;
const tone: Record<Sale["status"], Tone> = { "پرداخت‌شده": "sage", "بدهکار": "amber", "باطل": "neutral" };
const expCats = ["مواد مصرفی", "قبوض", "حقوق و پورسانت", "اجاره", "متفرقه"];

function SaleRow({ s, closed }: { s: Sale; closed: boolean }) {
  const [open, setOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <li className={clsx(s.status === "باطل" && "opacity-55")}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-right">
        <span className="min-w-0 flex-1 basis-40"><b className="block text-sm">{s.customerName}</b><span className="text-xs text-ink3">{s.id} · {s.time} · {s.lines.map((l) => l.name).join("، ")}</span></span>
        <b className="text-sm">{short(s.total)}</b>
        <Badge tone={tone[s.status]}>{s.status === "بدهکار" ? `بدهی ${short(s.debt)}` : s.status}</Badge>
        <ChevronDown size={15} className={clsx("text-ink3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line bg-surface2/50 px-5 py-3 text-sm">
          <ul className="space-y-1">{s.lines.map((l, i) => <li key={i} className="flex justify-between"><span>{l.name} × {fa(l.qty)}</span><span>{toman(l.price * l.qty)}</span></li>)}</ul>
          {s.discount > 0 && <p className="flex justify-between text-danger"><span>تخفیف {fa(s.discountPct)}٪</span><span>− {toman(s.discount)}</span></p>}
          <p className="text-xs text-ink2">پرداخت: {s.pays.length ? s.pays.map((p) => `${p.method} ${short(p.amount)}`).join(" + ") : "—"}{s.earned ? ` · ${fa(s.earned)} امتیاز` : ""}</p>
          {s.voidReason && <p className="text-xs text-danger">دلیل ابطال: {s.voidReason}</p>}
          {s.status !== "باطل" && !closed && (voiding ? (
            <div className="flex flex-wrap items-center gap-2"><input aria-label="دلیل ابطال" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل ابطال" className={`${fieldCls} !w-56 !py-1.5`} /><Button className="!bg-danger" onClick={() => { sales.voidSale(s.id, reason.trim() || "بدون دلیل"); setVoiding(false); }}>تأیید ابطال</Button><Button variant="ghost" onClick={() => setVoiding(false)}>انصراف</Button></div>
          ) : <Button variant="ghost" className="!text-danger" onClick={() => setVoiding(true)}><Ban size={14} />ابطال فاکتور</Button>)}
        </div>
      )}
    </li>
  );
}

export function CashierApp({ apptId }: { apptId?: string }) {
  const db = useDB();
  const [tab, setTab] = useState<(typeof tabs)[number]>(apptId ? "فاکتور جدید" : "امروز");
  const [done, setDone] = useState<{ id: string; earned: number } | null>(null);
  const sm = daySummary(db, 0);
  const closed = sales.isClosed(db, 0);
  const closing = db.closings.find((c) => c.day === 0);
  const today = db.sales.filter((s) => s.day === 0);

  // بدهی‌ها
  const debtors = db.customers.filter((c) => c.debt > 0);
  const [dp, setDp] = useState<Record<string, { amount: string; method: "نقدی" | "کارت" | "آنلاین" }>>({});
  // هزینه
  const [ex, setEx] = useState({ title: "", amount: "", method: "نقدی" as "نقدی" | "کارت", cat: expCats[0] });
  const [exErr, setExErr] = useState("");
  // بستن روز
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");

  return (
    <>
      <PageTitle title="صندوق و درآمد" sub="فاکتور، هزینه، بدهی و بستن روز؛ همه به مشتری، امتیاز و موجودی وصل است" actions={closed ? <Badge tone="danger" className="!px-3 !py-1"><Lock size={12} />روز بسته شده</Badge> : <Badge tone="sage" className="!px-3 !py-1">روز باز است</Badge>} />
      <div className="mb-5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setDone(null); }} className={clsx("cursor-pointer rounded-xl border px-3.5 py-2 text-[13px] font-semibold", tab === t ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{t}{t === "بدهی‌ها" && debtors.length > 0 && <span className="mr-1 rounded-full bg-amber px-1.5 text-[10px] text-white">{fa(debtors.length)}</span>}</button>)}
      </div>

      {tab === "امروز" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="فروش خالص امروز" value={short(sm.revenue)} sub={`${fa(sm.count)} فاکتور`} tone="rose" icon={<Receipt size={16} />} />
            <Stat label="فروش خدمات" value={short(sm.services)} tone="gold" />
            <Stat label="فروش محصول" value={short(sm.products)} tone="sage" />
            <Stat label="تخفیف‌ها" value={short(sm.discounts)} tone="amber" />
            <Stat label="نقدی" value={short(sm.cash)} tone="sage" />
            <Stat label="کارت" value={short(sm.card)} tone="sky" />
            <Stat label="آنلاین" value={short(sm.online)} tone="rose" />
            <Stat label="بدهی جدید" value={short(sm.newDebt)} tone="danger" />
            <Stat label="هزینه‌ها" value={short(sm.expenses)} tone="neutral" />
            <Stat label="پورسانت متخصص‌ها" value={short(sm.commission)} />
            <Stat label="دریافت بدهی" value={short(sm.debtCollected)} tone="sage" />
            <Stat label="سود روز (فروش − هزینه)" value={short(sm.net)} tone="gold" />
          </div>
          <Card className="mt-5">
            <CardHead title="فاکتورهای امروز" action={!closed && <Button onClick={() => setTab("فاکتور جدید")}><Plus size={14} />فاکتور جدید</Button>} />
            <ul className="divide-y divide-line border-t border-line">{[...today].reverse().map((s) => <SaleRow key={s.id} s={s} closed={closed} />)}</ul>
            {!today.length && <p className="px-5 pb-6 text-center text-sm text-ink3">هنوز فاکتوری امروز ثبت نشده است.</p>}
          </Card>
        </>
      )}

      {tab === "فاکتور جدید" && (done ? (
        <Card className="mx-auto max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto text-sage" size={44} />
          <h2 className="mt-3 text-xl font-extrabold">فاکتور {done.id} ثبت شد</h2>
          {done.earned > 0 && <p className="mt-2 text-sm text-ink2">{fa(done.earned)} امتیاز به مشتری اضافه شد.</p>}
          <div className="mt-5 flex flex-wrap justify-center gap-2"><Button onClick={() => setDone(null)}>فاکتور جدید</Button><Button variant="ghost" onClick={() => { setDone(null); setTab("امروز"); }}>مشاهده‌ی فاکتورها</Button></div>
        </Card>
      ) : <PosForm apptId={apptId} onDone={(id, earned) => setDone({ id, earned })} />)}

      {tab === "هزینه‌ها" && (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardHead title="هزینه‌های امروز" hint={`مجموع ${toman(sm.expenses)}`} />
            <ul className="divide-y divide-line border-t border-line">
              {db.expenses.filter((e) => e.day === 0).map((e) => <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1"><b className="block">{e.title}</b><span className="text-xs text-ink3">{e.cat} · {e.method}</span></span><b>{toman(e.amount)}</b>{!closed && <button aria-label={`حذف ${e.title}`} onClick={() => sales.deleteExpense(e.id)} className="cursor-pointer rounded-lg p-1.5 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>}</li>)}
              {!db.expenses.some((e) => e.day === 0) && <li className="px-5 py-6 text-center text-sm text-ink3">هزینه‌ای ثبت نشده است.</li>}
            </ul>
          </Card>
          <Card>
            <CardHead title="ثبت هزینه" />
            <form onSubmit={(e) => { e.preventDefault(); const a = +ex.amount; if (closed) return setExErr("روز بسته است."); if (ex.title.trim().length < 2 || !(a > 0)) return setExErr("عنوان و مبلغ را وارد کنید."); sales.addExpense({ title: ex.title.trim(), amount: a, method: ex.method, cat: ex.cat }); setEx({ ...ex, title: "", amount: "" }); setExErr(""); }} className="space-y-3 px-5 pb-5">
              <Field label="عنوان"><input value={ex.title} onChange={(e) => setEx({ ...ex, title: e.target.value })} className={fieldCls} /></Field>
              <Field label="مبلغ (تومان)"><input type="number" min={0} value={ex.amount} onChange={(e) => setEx({ ...ex, amount: e.target.value })} className={fieldCls} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="دسته"><select value={ex.cat} onChange={(e) => setEx({ ...ex, cat: e.target.value })} className={fieldCls}>{expCats.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="پرداخت از"><select value={ex.method} onChange={(e) => setEx({ ...ex, method: e.target.value as "نقدی" | "کارت" })} className={fieldCls}><option>نقدی</option><option>کارت</option></select></Field>
              </div>
              {exErr && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{exErr}</p>}
              <Button type="submit" className="w-full">ثبت هزینه</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === "بدهی‌ها" && (
        <Card>
          <CardHead title="بدهی مشتریان" hint={`مجموع ${toman(debtors.reduce((a, c) => a + c.debt, 0))}`} />
          <ul className="divide-y divide-line border-t border-line">
            {debtors.map((c) => {
              const f = dp[c.id] ?? { amount: String(c.debt), method: "نقدی" as const };
              const a = +f.amount;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                  <Avatar name={c.name} size={36} />
                  <Link href={`/customers/${c.id}`} className="min-w-0 flex-1 basis-32 text-sm font-bold hover:text-rose">{c.name}<span className="block text-xs font-normal text-danger">بدهی: {toman(c.debt)}</span></Link>
                  <input aria-label={`مبلغ دریافت از ${c.name}`} type="number" min={0} max={c.debt} value={f.amount} onChange={(e) => setDp({ ...dp, [c.id]: { ...f, amount: e.target.value } })} className={`${fieldCls} !w-32 !py-1.5`} />
                  <select aria-label="روش" value={f.method} onChange={(e) => setDp({ ...dp, [c.id]: { ...f, method: e.target.value as typeof f.method } })} className={`${fieldCls} !w-auto !py-1.5`}><option>نقدی</option><option>کارت</option><option>آنلاین</option></select>
                  <Button variant="soft" disabled={!(a > 0) || a > c.debt || closed} onClick={() => { sales.payDebt(c.id, a, f.method); setDp({ ...dp, [c.id]: { ...f, amount: "" } }); }}><Wallet size={14} />دریافت</Button>
                </li>
              );
            })}
            {!debtors.length && <li className="px-5 py-8 text-center text-sm text-ink3">هیچ مشتری بدهکاری وجود ندارد 🎉</li>}
          </ul>
        </Card>
      )}

      {tab === "بستن روز" && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="تطبیق صندوق نقدی" hint="نقدی دریافتی − هزینه‌ی نقدی" />
            <dl className="divide-y divide-line px-5 pb-3 text-sm">
              {[["فروش نقدی", toman(sm.cash)], ["دریافت نقدی بدهی", toman(db.debtPays.filter((p) => p.day === 0 && p.method === "نقدی").reduce((a, p) => a + p.amount, 0))], ["هزینه‌ی نقدی", `− ${toman(db.expenses.filter((e) => e.day === 0 && e.method === "نقدی").reduce((a, e) => a + e.amount, 0))}`]].map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-ink3">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              <div className="flex justify-between py-3 text-base font-extrabold"><dt>موجودی مورد انتظار صندوق</dt><dd className="text-rosedeep">{toman(sm.cashExpected)}</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHead title={closed ? "روز بسته شده است" : "بستن روز"} />
            <div className="space-y-3 px-5 pb-5 text-sm">
              {closed && closing ? (
                <>
                  <p>شمارش: <b>{toman(closing.countedCash)}</b> · اختلاف: <b className={closing.countedCash - closing.expectedCash === 0 ? "text-sage" : "text-danger"}>{closing.countedCash - closing.expectedCash > 0 ? "+" : ""}{toman(closing.countedCash - closing.expectedCash)}</b></p>
                  {closing.note && <p className="text-ink2">{closing.note}</p>}
                  <Button variant="ghost" onClick={() => sales.reopenDay(0)}><LockOpen size={14} />بازگشایی روز</Button>
                </>
              ) : (
                <>
                  <Field label="مبلغ نقد شمارش‌شده در صندوق (تومان)"><input type="number" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} className={fieldCls} /></Field>
                  {counted !== "" && <p className={clsx("rounded-xl p-2.5 text-xs", +counted === sm.cashExpected ? "bg-sagesoft text-sage" : "bg-ambersoft text-amber")}>اختلاف با موجودی مورد انتظار: <b>{+counted - sm.cashExpected > 0 ? "+" : ""}{toman(+counted - sm.cashExpected)}</b></p>}
                  <Field label="یادداشت (اختیاری)"><input value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
                  <Button disabled={counted === ""} onClick={() => { sales.closeDay(0, +counted, note.trim()); setCounted(""); setNote(""); }}><Lock size={14} />بستن روز</Button>
                  <p className="text-xs text-ink3">پس از بستن روز، ثبت فاکتور، هزینه و ابطال متوقف می‌شود تا بازگشایی کنید.</p>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
