"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Badge, Button, Card, Field, fieldCls } from "@/components/ui";
import { actions } from "@/lib/db";
import { durationDiscount, plans } from "@/lib/mock4";
import { DEMO_OTP, digits, isPhone } from "@/lib/validate";
import { useDB } from "@/lib/db";
import { fa, short, toman } from "@/lib/fa";

const steps = ["اطلاعات", "تأیید موبایل", "انتخاب پلن", "پرداخت"] as const;

export function SignupWizard() {
  const router = useRouter();
  const db = useDB();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ owner: "", salonName: "", phone: "", city: "" });
  const [code, setCode] = useState("");
  const [planId, setPlanId] = useState("pro");
  const [months, setMonths] = useState(3);
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState("");

  const plan = plans.find((p) => p.id === planId)!;
  const off = durationDiscount.find((d) => d.m === months)!.off;
  const total = Math.round(plan.price * months * (1 - off / 100));

  const next = () => {
    setErr("");
    if (step === 0) {
      if (f.owner.trim().length < 3 || f.salonName.trim().length < 2 || !f.city.trim()) return setErr("همه‌ی فیلدها را کامل کنید.");
      if (!isPhone(f.phone)) return setErr("شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).");
    }
    if (step === 1 && digits(code) !== DEMO_OTP) return setErr("کد تأیید اشتباه است.");
    setStep(step + 1);
  };
  const finish = (trial: boolean) => {
    if (!trial && !terms) return setErr("برای پرداخت باید قوانین را بپذیرید.");
    actions.signup({ ...f, planId, months, trial });
    router.push("/onboarding");
  };

  return (
    <div>
      <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label="مراحل ثبت‌نام">
        {steps.map((s, i) => <li key={s} className={clsx("rounded-xl px-1 py-2 text-center text-[12px] font-semibold", i === step ? "bg-rose text-white" : i < step ? "bg-rosesoft text-rosedeep" : "bg-surface2 text-ink3")}>{fa(i + 1)}. {s}</li>)}
      </ol>
      <Card className="p-5 md:p-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">اطلاعات شما و سالن</h2>
            <Field label="نام و نام خانوادگی"><input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} className={fieldCls} autoComplete="name" /></Field>
            <Field label="نام سالن"><input value={f.salonName} onChange={(e) => setF({ ...f, salonName: e.target.value })} className={fieldCls} /></Field>
            <Field label="شماره موبایل"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} autoComplete="tel" /></Field>
            <Field label="شهر"><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={fieldCls} /></Field>
          </div>
        )}
        {step === 1 && (
          <div className="mx-auto max-w-xs space-y-3 text-center">
            <h2 className="font-bold">تأیید شماره موبایل</h2>
            <p className="text-sm text-ink2">کد ۵ رقمی به <bdi dir="ltr">{f.phone}</bdi> ارسال شد.<br />(نسخه‌ی نمایشی: <b>{DEMO_OTP}</b>)</p>
            <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} aria-label="کد تأیید" inputMode="numeric" dir="ltr" maxLength={5} style={{ textAlign: "center", letterSpacing: "0.4em" }} className={fieldCls} autoComplete="one-time-code" />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold">پلن مناسب خود را انتخاب کنید</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {plans.map((p) => (
                <button key={p.id} onClick={() => setPlanId(p.id)} aria-pressed={planId === p.id} className={clsx("cursor-pointer rounded-2xl border p-4 text-right", planId === p.id ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                  <span className="flex items-center justify-between"><b>{p.name}</b>{"hot" in p && p.hot && <Badge tone="rose">محبوب</Badge>}</span>
                  <b className="mt-2 block text-lg">{short(p.price)} <span className="text-xs font-normal text-ink3">تومان / ماه</span></b>
                  <span className="mt-2 block text-xs leading-6 text-ink2">تا {fa(p.users)} کاربر · <b>{fa((db.planModules[p.id] ?? []).length)} ماژول</b><br />{p.features.slice(0, 3).join(" · ")}</span>
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">مدت اشتراک</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="مدت">
                {durationDiscount.map((d) => <button key={d.m} role="radio" aria-checked={months === d.m} onClick={() => setMonths(d.m)} className={clsx("cursor-pointer rounded-xl border py-2.5 text-sm font-bold", months === d.m ? "border-rose bg-rosesoft text-rosedeep" : "border-line")}>{fa(d.m)} ماه{d.off > 0 && <span className="block text-[11px] font-medium text-sage">{fa(d.off)}٪ تخفیف</span>}</button>)}
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold">تأیید و پرداخت</h2>
            <dl className="divide-y divide-line rounded-xl border border-line text-sm">
              {[["سالن", f.salonName], ["پلن", `${plan.name} · ${fa(months)} ماهه`], ["تخفیف مدت", off ? `${fa(off)}٪` : "—"]].map(([k, v]) => <div key={k} className="flex justify-between px-4 py-2.5"><dt className="text-ink3">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              <div className="flex justify-between px-4 py-3 text-base font-extrabold"><dt>مبلغ قابل پرداخت</dt><dd className="text-rosedeep">{toman(total)}</dd></div>
            </dl>
            <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 size-4 accent-[#b4536f]" />قوانین و حریم خصوصی را می‌پذیرم.</label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => finish(false)}><Check size={14} />پرداخت آنلاین و شروع</Button>
              <Button variant="ghost" onClick={() => finish(true)}>شروع دوره‌ی آزمایشی ۷ روزه (رایگان)</Button>
            </div>
          </div>
        )}
        {err && <p role="alert" className="mt-4 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          {step === 0 ? <Link href="/login" className="text-sm text-ink2 hover:text-ink">قبلاً ثبت‌نام کرده‌اید؟ ورود</Link> : <Button variant="ghost" onClick={() => { setErr(""); setStep(step - 1); }}><ArrowRight size={14} />قبلی</Button>}
          {step < 3 && <Button onClick={next}>{step === 0 ? "دریافت کد" : "ادامه"}<ArrowLeft size={14} /></Button>}
        </div>
      </Card>
    </div>
  );
}
