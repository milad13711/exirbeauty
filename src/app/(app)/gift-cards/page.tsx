"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check, Copy, Gift } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { growth } from "@/lib/growth";
import type { PayMethod } from "@/lib/seed-extra";
import { digits } from "@/lib/validate";
import { fa, short, toman } from "@/lib/fa";

const occ = ["تولد", "عروسی", "روز مادر", "بدون مناسبت"];
const amounts = [500_000, 1_000_000, 2_000_000, 5_000_000];

export default function GiftCards() {
  const db = useDB();
  const [f, setF] = useState({ buyerId: "", fromName: "", toName: "", toPhone: "", occasion: occ[0], message: "", amount: 2_000_000, method: "کارت" as PayMethod });
  const [err, setErr] = useState("");
  const [made, setMade] = useState<{ code: string; f: typeof f } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const outstanding = db.giftCards.filter((g) => g.status === "فعال").reduce((a, g) => a + g.balance, 0);
  const buyer = db.customers.find((c) => c.id === f.buyerId);

  const submit = () => {
    setMade(null);
    const from = buyer?.name ?? f.fromName.trim();
    if (from.length < 3) return setErr("نام خریدار را وارد یا انتخاب کنید.");
    if (f.toName.trim().length < 2) return setErr("نام گیرنده را وارد کنید.");
    if (!/^09\d{9}$/.test(digits(f.toPhone).replace(/\s/g, ""))) return setErr("موبایل گیرنده معتبر نیست.");
    if (f.amount < 100_000) return setErr("حداقل مبلغ کارت هدیه ۱۰۰ هزار تومان است.");
    const r = growth.issueGift({ buyerId: f.buyerId || null, fromName: from, toName: f.toName.trim(), toPhone: f.toPhone, occasion: f.occasion, message: f.message.trim(), amount: f.amount, method: f.method });
    if (!r.ok) return setErr(r.msg);
    setErr(""); setMade({ code: r.code!, f: { ...f, fromName: from } }); setF({ ...f, toName: "", toPhone: "", message: "" });
  };
  const copy = (code: string) => { navigator.clipboard?.writeText(code).catch(() => {}); setCopied(code); setTimeout(() => setCopied(null), 1600); };
  const tone = { "فعال": "sage", "استفاده‌شده": "neutral", "باطل": "danger" } as const;

  return (
    <>
      <PageTitle title="کارت هدیه" sub="فروش کارت هدیه در صندوق ثبت می‌شود؛ گیرنده با کد در صندوق یا پنل خود استفاده می‌کند" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="کارت‌های صادرشده" value={fa(db.giftCards.length)} tone="rose" icon={<Gift size={16} />} />
        <Stat label="تعهد باقی‌مانده (فعال)" value={short(outstanding)} tone="amber" />
        <Stat label="فروش کل" value={short(db.giftCards.reduce((a, g) => a + g.amount, 0))} tone="sage" />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="صدور کارت هدیه" />
          <div className="space-y-3 px-5 pb-5">
            <Field label="خریدار (مشتری موجود)"><select value={f.buyerId} onChange={(e) => setF({ ...f, buyerId: e.target.value })} className={fieldCls}><option value="">مشتری دیگر / مهمان</option>{db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            {!f.buyerId && <Field label="نام خریدار"><input value={f.fromName} onChange={(e) => setF({ ...f, fromName: e.target.value })} className={fieldCls} /></Field>}
            <div className="grid grid-cols-2 gap-3"><Field label="نام گیرنده"><input value={f.toName} onChange={(e) => setF({ ...f, toName: e.target.value })} className={fieldCls} /></Field><Field label="موبایل گیرنده"><input value={f.toPhone} onChange={(e) => setF({ ...f, toPhone: e.target.value })} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field></div>
            <div className="flex flex-wrap gap-2">{occ.map((x) => <button key={x} onClick={() => setF({ ...f, occasion: x })} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", f.occasion === x ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line text-ink2")}>{x}</button>)}</div>
            <div className="grid grid-cols-2 gap-2">{amounts.map((x) => <button key={x} onClick={() => setF({ ...f, amount: x })} className={clsx("cursor-pointer rounded-xl border py-2.5 text-sm font-bold", f.amount === x ? "border-rose bg-rosesoft text-rosedeep" : "border-line")}>{toman(x)}</button>)}</div>
            <Field label="یا مبلغ دلخواه (تومان)"><input type="number" min={100000} step={50000} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value || 0 })} className={fieldCls} /></Field>
            <Field label="پیام (اختیاری)"><input value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className={fieldCls} /></Field>
            <Field label="روش پرداخت"><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as PayMethod })} className={fieldCls}>{(["کارت", "نقدی", "آنلاین", "کیف پول"] as PayMethod[]).map((m) => <option key={m}>{m}</option>)}</select></Field>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
            <Button className="w-full" onClick={submit}>پرداخت و صدور کارت</Button>
          </div>
        </Card>

        <div className="space-y-5">
          {made ? (
            <div className="rounded-2xl bg-gradient-to-br from-plum to-rosedeep p-6 text-white shadow-lg">
              <Gift size={26} className="text-gold" />
              <p className="mt-5 text-xs text-white/60">کارت هدیه {db.salon.name} · {made.f.occasion}</p>
              <p className="mt-1 text-3xl font-extrabold">{toman(made.f.amount)}</p>
              <p className="mt-3 text-sm text-white/85">برای {made.f.toName} · از طرف {made.f.fromName}</p>
              <bdi dir="ltr" className="mt-3 inline-block rounded-lg bg-white/15 px-3 py-1.5 font-mono text-sm">{made.code}</bdi>
              <p className="mt-3 text-xs leading-6 text-white/70">پیامک برای {made.f.toPhone} ارسال شد: «{made.f.message || "یک هدیه برای شما"}»</p>
            </div>
          ) : <Card className="grid place-items-center p-10 text-center text-sm text-ink3">پس از صدور، کارت هدیه و کد آن اینجا نمایش داده می‌شود.</Card>}
          <Card>
            <CardHead title="کارت‌های صادرشده" />
            <ul className="divide-y divide-line">
              {db.giftCards.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-40"><b className="block">{g.toName} <span className="font-normal text-ink3">← {g.fromName}</span></b><span className="text-xs text-ink3">{g.occasion} · مانده {toman(g.balance)} از {short(g.amount)}</span></span>
                  <Badge tone={tone[g.status]}>{g.status}</Badge>
                  <Button variant="ghost" onClick={() => copy(g.code)}>{copied === g.code ? <><Check size={13} />کپی شد</> : <><Copy size={13} />کد</>}</Button>
                  {g.status === "فعال" && g.balance === g.amount && <Button variant="ghost" className="!text-danger" onClick={() => growth.voidGift(g.id)}>ابطال</Button>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
