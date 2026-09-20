"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { settle, settlementsOf, walletOf } from "@/lib/settle";
import { dayInfo } from "@/lib/dates";
import { fa, short, toman } from "@/lib/fa";
import { digits } from "@/lib/validate";

const tone = { "در انتظار": "amber", "پرداخت شد": "sage", "رد شد": "danger", "لغو شد": "neutral" } as const;
type Act = { id: string; kind: "pay" | "reject" } | null;

export default function SettlePage() {
  const db = useDB();
  const [act, setAct] = useState<Act>(null);
  const [method, setMethod] = useState<"نقدی" | "کارت">("کارت");
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [direct, setDirect] = useState<{ staffId: string; amount: string } | null>(null);
  const [err, setErr] = useState("");

  const blocked = db.session?.role === "staff";
  const all = settlementsOf(db);
  const pending = all.filter((s) => s.status === "در انتظار");
  const paidToday = all.filter((s) => s.status === "پرداخت شد" && s.paidDay === 0).reduce((a, s) => a + s.amount, 0);
  const owed = db.staff.reduce((a, m) => a + walletOf(db, m.id).available, 0);
  const name = (id: string) => db.staff.find((m) => m.id === id)?.name ?? "—";
  const close = () => { setAct(null); setRef(""); setReason(""); setErr(""); };

  if (blocked) return <Card className="p-8 text-center text-sm text-ink2">پرداخت تسویه فقط برای مدیر سالن (کاربر اصلی) در دسترس است.</Card>;

  return (
    <>
      <PageTitle title="تسویه پرسنل" sub="کیف پول هر متخصص از کمیسیون خدماتش پر می‌شود؛ درخواست‌ها را اینجا بررسی و پرداخت کنید" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="در انتظار" value={fa(pending.length)} sub={short(pending.reduce((a, s) => a + s.amount, 0))} tone="amber" />
        <Stat label="پرداخت امروز" value={short(paidToday)} tone="sage" />
        <Stat label="بدهی به پرسنل" value={short(owed)} tone="rose" />
      </div>

      <Card className="mt-5">
        <CardHead title="درخواست‌های در انتظار" />
        <ul className="divide-y divide-line">
          {pending.map((s) => (
            <li key={s.id} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Avatar name={name(s.staffId)} size={38} color={db.staff.find((m) => m.id === s.staffId)?.color} />
                <div className="min-w-0 flex-1 basis-36"><b className="block truncate text-sm">{name(s.staffId)}</b><span className="text-xs text-ink3">{s.day === 0 ? "امروز" : dayInfo(s.day).short}{s.note ? ` · ${s.note}` : ""}</span></div>
                <b className="font-num text-sm">{toman(s.amount)}</b>
              </div>
              {act?.id === s.id ? (
                <div className="space-y-2 rounded-2xl bg-surface2 p-3">
                  {act.kind === "pay" ? (
                    <>
                      <div className="flex gap-2">{(["کارت", "نقدی"] as const).map((m) => <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={`press min-h-10 flex-1 cursor-pointer rounded-full border text-[13px] font-bold ${method === m ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line bg-surface text-ink2"}`}>{m === "کارت" ? "کارت / انتقال" : "نقدی"}</button>)}</div>
                      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="شماره پیگیری (اختیاری)" aria-label="شماره پیگیری" className={fieldCls} />
                      <div className="flex gap-2"><Button className="flex-1" onClick={() => { settle.pay(s.id, method, ref.trim()); close(); }}><Check size={15} />تأیید پرداخت</Button><Button variant="ghost" onClick={close}>انصراف</Button></div>
                      <p className="text-[11px] text-ink3">پرداخت به‌عنوان هزینه در صندوق امروز ثبت می‌شود.</p>
                    </>
                  ) : (
                    <>
                      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل رد (اختیاری)" aria-label="دلیل رد" className={fieldCls} />
                      <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => { settle.reject(s.id, reason.trim()); close(); }}>رد درخواست</Button><Button variant="ghost" onClick={close}>انصراف</Button></div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex gap-2"><Button className="flex-1" onClick={() => setAct({ id: s.id, kind: "pay" })}>پرداخت</Button><Button variant="ghost" aria-label="رد" onClick={() => setAct({ id: s.id, kind: "reject" })}><X size={15} />رد</Button></div>
              )}
            </li>
          ))}
          {!pending.length && <li className="px-5 py-8 text-center text-sm text-ink3">درخواستی در انتظار نیست.</li>}
        </ul>
      </Card>

      <Card className="mt-5">
        <CardHead title="کیف پول پرسنل" hint="تسویه‌ی مستقیم بدون نیاز به درخواست" />
        <ul className="divide-y divide-line">
          {db.staff.filter((m) => m.active).map((m) => {
            const w = walletOf(db, m.id);
            return (
              <li key={m.id} className="space-y-2 px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><Avatar name={m.name} size={36} color={m.color} /><div className="min-w-0 flex-1 basis-32"><b className="block truncate text-sm">{m.name}</b>{w.pending > 0 && <Badge tone="amber">{toman(w.pending)} در انتظار</Badge>}</div><b className="font-num text-sm">{toman(w.available)}</b>
                  {direct?.staffId !== m.id && <Button variant="ghost" disabled={w.available <= 0} onClick={() => setDirect({ staffId: m.id, amount: "" })}>تسویه</Button>}
                </div>
                {direct?.staffId === m.id && (
                  <div className="space-y-2 rounded-2xl bg-surface2 p-3">
                    <Field label="مبلغ (تومان)"><input value={direct.amount} onChange={(e) => setDirect({ ...direct, amount: e.target.value })} inputMode="numeric" className={fieldCls} /></Field>
                    <div className="flex gap-2">{(["کارت", "نقدی"] as const).map((x) => <button key={x} type="button" aria-pressed={method === x} onClick={() => setMethod(x)} className={`press min-h-10 flex-1 cursor-pointer rounded-full border text-[13px] font-bold ${method === x ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line bg-surface text-ink2"}`}>{x === "کارت" ? "کارت / انتقال" : "نقدی"}</button>)}</div>
                    {err && <p role="alert" className="text-xs text-danger">{err}</p>}
                    <div className="flex gap-2"><Button className="flex-1" onClick={() => { const e = settle.payDirect(m.id, parseInt(digits(direct.amount).replace(/\D/g, ""), 10) || 0, method, ""); if (e) setErr(e); else { setDirect(null); setErr(""); } }}>پرداخت</Button><Button variant="ghost" onClick={() => { setDirect(null); setErr(""); }}>انصراف</Button></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-5">
        <CardHead title="سابقه‌ی تسویه‌ها" />
        <ul className="divide-y divide-line">
          {all.filter((s) => s.status !== "در انتظار").slice(0, 12).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm"><span className="min-w-0 flex-1 basis-32"><b className="block truncate">{name(s.staffId)}</b><span className="text-xs text-ink3">{s.paidDay === 0 || s.day === 0 ? "امروز" : dayInfo(s.paidDay ?? s.day).short}{s.method ? ` · ${s.method}` : ""}{s.ref ? ` · پیگیری ${s.ref}` : ""}</span></span><b className="font-num">{short(s.amount)}</b><Badge tone={tone[s.status]}>{s.status}</Badge></li>
          ))}
        </ul>
      </Card>
    </>
  );
}
