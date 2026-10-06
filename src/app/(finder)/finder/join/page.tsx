"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, fieldCls } from "@/components/ui";
import { MapPinPicker } from "@/components/finder/MapPinPicker";
import { FINDER_CATS, catStyle, type FinderCat } from "@/lib/finder";
import { PLAN_INFO, errorText, finderApi, type FinderPlan, type ListingStaff } from "@/lib/finderApi";

const steps = ["پلن", "اطلاعات", "موقعیت روی نقشه", "بازبینی"] as const;

export default function JoinFinderPage() {
  const [plan, setPlan] = useState<FinderPlan | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [cats, setCats] = useState<FinderCat[]>([]);
  const [pin, setPin] = useState<{ x: number; y: number; city: string } | null>(null);
  const [staff, setStaff] = useState<ListingStaff[]>([]);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ id: string; editCode: string; plan: FinderPlan } | null>(null);
  const [busy, setBusy] = useState(false);

  const needsSteps: readonly string[] = plan === "salon" ? ["پلن", "اطلاعات", "موقعیت روی نقشه", "متخصص‌ها", "بازبینی"] : steps;
  const isSalon = plan === "salon";

  function toggleCat(c: FinderCat) { setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])); }

  function validateInfo() {
    if (name.trim().length < 3) return "نام را کامل وارد کنید.";
    if (isSalon && brand.trim().length < 2) return "نام سالن را وارد کنید.";
    if (!/^09\d{9}$/.test(phone.replace(/\s/g, ""))) return "شماره موبایل معتبر نیست.";
    if (cats.length === 0) return "حداقل یک نوع خدمت را انتخاب کنید.";
    return "";
  }

  function next() {
    if (step === 1) { const e = validateInfo(); if (e) return setErr(e); }
    if (step === 2 && !pin) return setErr("لطفاً روی نقشه لوکیشن را مشخص کنید.");
    setErr("");
    setStep((s) => s + 1);
  }

  async function submit() {
    if (!plan || !pin || busy) return;
    setBusy(true); setErr("");
    try {
      const rec = await finderApi.create({
        plan, name: name.trim(), brand: isSalon ? brand.trim() : undefined, phone, city: pin.city, x: pin.x, y: pin.y, cats, bio: bio.trim(),
        staff: isSalon ? staff.filter((s) => s.name.trim() && s.cats.length) : [],
      });
      setDone({ id: rec.id, editCode: rec.editCode, plan });
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="page-in mx-auto max-w-lg">
        <Card className="p-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-sagesoft text-sage"><Check size={28} /></span>
          <h1 className="mt-4 text-xl font-extrabold text-ink">ثبت‌نام شما ثبت شد</h1>
          <p className="mt-2 text-sm leading-7 text-ink2">پروفایل شما با پلن «{PLAN_INFO[done.plan].title}» برای بررسی ارسال شد. پس از تأیید تیم اکسیر، روی نقشه‌ی اکسیریاب منتشر می‌شود.</p>
          <div className="mt-5 rounded-xl bg-surface2 p-4 text-right">
            <p className="text-xs font-bold text-ink2">کد ویرایش پروفایل — حتماً یادداشت کنید</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-surface p-2.5">
              <bdi dir="ltr" className="font-mono text-lg font-extrabold tracking-widest text-rosedeep">{done.editCode}</bdi>
              <Button variant="ghost" className="!min-h-8 !px-2.5" onClick={() => navigator.clipboard?.writeText(done.editCode)}><Copy size={14} /></Button>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-ink3">با این کد و شناسه‌ی پروفایل («{done.id}») بعداً می‌توانید از صفحه‌ی «ویرایش پروفایل» اطلاعات را تغییر دهید.</p>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/finder" className="press rounded-xl bg-[image:var(--grad-rose)] px-4 py-2.5 text-[13px] font-bold text-white">بازگشت به نقشه</Link>
            <Link href={`/finder/manage?id=${done.id}`} className="press rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-bold text-ink2">رفتن به ویرایش پروفایل</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-in">
      <div className="mb-5 max-w-2xl">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink md:text-2xl">ثبت رایگان روی اکسیریاب</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink2">پروفایل بساز، لوکیشن دقیقت رو روی نقشه پین کن، و مشتری‌های نزدیک خودت رو پیدا کن.</p>
      </div>

      <ol className="mb-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${needsSteps.length}, minmax(0, 1fr))` }} aria-label="مراحل ثبت‌نام">
        {needsSteps.map((s, i) => (
          <li key={s} className={clsx("truncate rounded-xl px-1 py-2 text-center text-[11.5px] font-semibold", i === step ? "bg-rose text-white" : i < step ? "bg-rosesoft text-rosedeep" : "bg-surface2 text-ink3")}>{s}</li>
        ))}
      </ol>

      <Card className="p-5">
        {step === 0 && (
          <div>
            <h2 className="mb-4 font-bold">کدام پلن مناسب شماست؟</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(PLAN_INFO) as FinderPlan[]).map((k) => {
                const p = PLAN_INFO[k];
                const active = plan === k;
                return (
                  <button key={k} onClick={() => setPlan(k)} className={clsx("flex h-full flex-col rounded-2xl border p-4 text-right transition-shadow", active ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                    <b className="text-[15px] text-ink">{p.title}</b>
                    <span className="mt-0.5 text-xs text-ink3">{p.tagline}</span>
                    <span className="mt-2 text-sm font-extrabold text-rosedeep">{p.price}</span>
                    <ul className="mt-3 space-y-1.5 text-[12px] leading-5 text-ink2">
                      {p.features.map((f) => <li key={f} className="flex items-start gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-sage" />{f}</li>)}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold">اطلاعات {isSalon ? "سالن" : "شخصی"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={isSalon ? "نام مدیر سالن" : "نام و نام خانوادگی"}><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
              {isSalon && <Field label="نام سالن"><input value={brand} onChange={(e) => setBrand(e.target.value)} className={fieldCls} /></Field>}
              <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-ink2">نوع خدمات</p>
              <div className="flex flex-wrap gap-1.5">
                {FINDER_CATS.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCat(c)} className={clsx("rounded-full px-3 py-1.5 text-xs font-bold transition-colors", cats.includes(c) ? "bg-[image:var(--grad-rose)] text-white" : clsx(catStyle[c].bg, catStyle[c].fg))}>{c}</button>
                ))}
              </div>
            </div>
            <Field label="بیوگرافی کوتاه (اختیاری)"><textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="سابقه، تخصص و ویژگی‌های کارتان را بنویسید" className={fieldCls} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-bold">لوکیشن دقیق {isSalon ? "سالن" : "شما"} کجاست؟</h2>
            <p className="text-xs text-ink3">روی نقشه لمس یا کلیک کنید تا پین دقیق ثبت شود؛ شهر به‌صورت خودکار تشخیص داده می‌شود.</p>
            <MapPinPicker x={pin?.x} y={pin?.y} onPick={setPin} />
            {pin && <p className="text-sm text-ink2">شهر تشخیص داده‌شده: <b>{pin.city}</b></p>}
          </div>
        )}

        {isSalon && step === 3 && (
          <div className="space-y-3">
            <h2 className="font-bold">متخصص‌های سالن (تا ۱۰ نفر)</h2>
            <p className="text-xs text-ink3">هرکدام روی نقشه پین جداگانه می‌گیرند و امکان رزرو مستقیم دارند.</p>
            <div className="space-y-2.5">
              {staff.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
                  <input value={s.name} onChange={(e) => setStaff((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="نام متخصص" className={clsx(fieldCls, "!w-40")} />
                  <div className="flex flex-1 flex-wrap gap-1">
                    {FINDER_CATS.map((c) => {
                      const on = s.cats.includes(c);
                      return <button key={c} type="button" onClick={() => setStaff((list) => list.map((x, j) => (j === i ? { ...x, cats: on ? x.cats.filter((y) => y !== c) : [...x.cats, c] } : x)))} className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", on ? "bg-[image:var(--grad-rose)] text-white" : clsx(catStyle[c].bg, catStyle[c].fg))}>{c}</button>;
                    })}
                  </div>
                  <button type="button" onClick={() => setStaff((list) => list.filter((_, j) => j !== i))} className="grid size-8 shrink-0 place-items-center rounded-lg text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {staff.length < 10 && <Button variant="ghost" onClick={() => setStaff((list) => [...list, { name: "", cats: [] }])}><Plus size={14} />افزودن متخصص</Button>}
          </div>
        )}

        {step === needsSteps.length - 1 && (
          <div className="space-y-3">
            <h2 className="font-bold">بازبینی نهایی</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink3">پلن</dt><dd className="font-bold">{plan && PLAN_INFO[plan].title}</dd></div>
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink3">نام</dt><dd>{isSalon ? `${brand} (مدیر: ${name})` : name}</dd></div>
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink3">موبایل</dt><dd><bdi dir="ltr">{phone}</bdi></dd></div>
              <div className="flex justify-between border-b border-line pb-2"><dt className="text-ink3">شهر</dt><dd>{pin?.city}</dd></div>
              <div className="flex flex-wrap justify-between gap-2 pb-2"><dt className="text-ink3">خدمات</dt><dd className="flex flex-wrap justify-end gap-1">{cats.map((c) => <Badge key={c} className={clsx(catStyle[c].bg, catStyle[c].fg)}>{c}</Badge>)}</dd></div>
              {isSalon && <div className="flex justify-between"><dt className="text-ink3">تعداد متخصص</dt><dd>{staff.filter((s) => s.name.trim()).length} نفر</dd></div>}
            </dl>
            <Badge tone="amber">پس از تأیید تیم اکسیر روی نقشه منتشر می‌شوید؛ ویرایش‌های بعدی هم دوباره نیاز به تأیید دارند.</Badge>
          </div>
        )}

        {err && <p role="alert" className="mt-4 rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-line pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ChevronRight size={14} />قبلی</Button>
          {step < needsSteps.length - 1 ? (
            <Button disabled={step === 0 && !plan} onClick={next}>بعدی<ChevronLeft size={14} /></Button>
          ) : (
            <Button onClick={submit} disabled={busy}><Check size={14} />{busy ? "در حال ارسال…" : "ارسال برای تأیید"}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
