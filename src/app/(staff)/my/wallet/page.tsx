"use client";
import { useState } from "react";
import { Check, Clock, X } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { useMeStaff } from "@/components/staff/StaffShell";
import { useDB } from "@/lib/db";
import { settle, walletOf } from "@/lib/settle";
import { fa, short, toman } from "@/lib/fa";
import { digits } from "@/lib/validate";
import { dayInfo } from "@/lib/dates";

const tone = { "در انتظار": "amber", "پرداخت شد": "sage", "رد شد": "danger", "لغو شد": "neutral" } as const;

export default function MyWallet() {
  const db = useDB();
  const me = useMeStaff();
  const [amount, setAmount] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  if (!me) return null;
  const w = walletOf(db, me.id);
  const earnings = db.sales.filter((s) => s.status !== "باطل").flatMap((s) => s.lines.filter((l) => l.kind === "service" && l.staffId === me.id).map((l) => ({ id: `${s.id}${l.refId}`, name: l.name, day: s.day, v: Math.round(l.price * l.qty * (1 - s.discountPct / 100) * ((l.commissionPct ?? me.commissionPct) / 100)) }))).sort((a, b) => b.day - a.day).slice(0, 8);
  const n = parseInt(digits(amount).replace(/\D/g, ""), 10) || 0;

  const send = () => { const e = settle.request(me.id, n, text.trim()); if (e) { setErr(e); setOk(false); } else { setErr(""); setOk(true); setAmount(""); setText(""); setTimeout(() => setOk(false), 3000); } };

  return (
    <>
      <div className="relative overflow-hidden rounded-[26px] bg-[image:var(--grad-plum)] p-5 text-white shadow-[var(--shadow-pop)]">
        <span className="pointer-events-none absolute -bottom-16 -right-10 size-48 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.4),transparent_65%)]" aria-hidden />
        <p className="relative text-xs text-white/65">قابل برداشت</p>
        <p className="font-num relative mt-1 text-[34px] font-extrabold leading-tight">{short(w.available)} <span className="text-sm font-semibold text-white/60">تومان</span></p>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          {[["کل کمیسیون", short(w.earned)], ["تسویه‌شده", short(w.paid)], ["در انتظار", short(w.pending)]].map(([l, v]) => <div key={l} className="rounded-2xl bg-white/10 px-2 py-2 backdrop-blur"><p className="font-num text-[13px] font-extrabold">{v}</p><p className="text-[10.5px] text-white/65">{l}</p></div>)}
        </div>
      </div>

      <Card>
        <CardHead title="درخواست تسویه" hint="مدیر سالن درخواست را بررسی و پرداخت می‌کند" />
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-3 px-5 pb-5">
          <Field label="مبلغ (تومان)"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="مثلاً ۲٬۰۰۰٬۰۰۰" className={fieldCls} /></Field>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAmount(String(w.available))} className="press min-h-9 cursor-pointer rounded-full border border-line bg-surface px-3.5 text-xs font-bold text-ink2">تمام مانده</button>
            {[1_000_000, 2_000_000].filter((v) => v <= w.available).map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} className="press min-h-9 cursor-pointer rounded-full border border-line bg-surface px-3.5 text-xs font-bold text-ink2">{short(v)}</button>)}
          </div>
          {n > 0 && <p className="text-xs text-ink3">{toman(n)}</p>}
          <Field label="توضیح (اختیاری)"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="مثلاً واریز به کارت" className={fieldCls} /></Field>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs leading-6 text-danger">{err}</p>}
          {ok && <p className="flex items-center gap-1.5 rounded-xl bg-sagesoft p-2.5 text-xs font-bold text-sage"><Check size={14} />درخواست برای مدیر سالن ارسال شد.</p>}
          <Button type="submit" className="w-full !min-h-12" disabled={w.available <= 0}>ثبت درخواست تسویه</Button>
        </form>
      </Card>

      <Card>
        <CardHead title="سابقه‌ی تسویه‌ها" />
        <ul className="divide-y divide-line">
          {w.list.slice(0, 8).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 basis-32"><b className="font-num block">{toman(s.amount)}</b><span className="text-xs text-ink3">{s.day === 0 ? "امروز" : dayInfo(s.day).short}{s.method ? ` · ${s.method}` : ""}{s.reason ? ` · ${s.reason}` : ""}</span></span>
              <Badge tone={tone[s.status]}>{s.status === "در انتظار" && <Clock size={11} />}{s.status}</Badge>
              {s.status === "در انتظار" && <button aria-label="لغو درخواست" onClick={() => settle.cancel(s.id)} className="grid size-8 cursor-pointer place-items-center rounded-full text-ink3 hover:bg-surface2"><X size={15} /></button>}
            </li>
          ))}
        </ul>
      </Card>

      {earnings.length > 0 && (
        <Card>
          <CardHead title="آخرین درآمدها" hint="کمیسیون خدماتی که انجام داده‌اید" />
          <ul className="divide-y divide-line">{earnings.map((e) => <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span className="min-w-0 truncate">{e.name}<span className="mr-1 text-xs text-ink3">{e.day === 0 ? "امروز" : dayInfo(e.day).short}</span></span><b className="font-num shrink-0 text-sage">+{short(e.v)}</b></li>)}</ul>
        </Card>
      )}
      <p className="text-center text-[11px] text-ink3">{fa(w.list.length)} تراکنش تسویه ثبت شده است</p>
    </>
  );
}
