"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { HoursEditor } from "@/components/HoursEditor";
import { actions, useDB, type DayHours, type StaffMember } from "@/lib/db";
import { serviceTemplates } from "@/lib/mock2";
import { newStaff, uid } from "@/lib/factories";
import { catColor } from "@/lib/mock";
import { fa, short } from "@/lib/fa";

const steps = ["مشخصات سالن", "ساعت کاری", "خدمات", "متخصص‌ها"] as const;

export function OnboardingWizard() {
  const db = useDB();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState({ name: db.salon.name, phone: db.salon.phone, address: db.salon.address, city: db.salon.city });
  const [hours, setHours] = useState<DayHours[]>(db.salon.hours);
  const [picked, setPicked] = useState<Set<string>>(new Set(["کوتاهی", "رنگ ریشه", "فیشال هیدرا", "ژل و لاک"]));
  const [team, setTeam] = useState<StaffMember[]>([newStaff(4)]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const next = () => {
    setErr("");
    if (step === 0 && (info.name.trim().length < 2 || info.address.trim().length < 5)) return setErr("نام و آدرس سالن را کامل کنید.");
    if (step === 1 && hours.some((h) => h.open && h.end <= h.start)) return setErr("ساعت پایان باید بعد از ساعت شروع باشد.");
    if (step === 2 && picked.size === 0) return setErr("حداقل یک خدمت انتخاب کنید.");
    setStep(step + 1);
  };
  const finish = () => {
    const members = team.filter((m) => m.name.trim().length > 1).map((m) => ({ ...m, role: m.role.trim() || "متخصص" }));
    const ids = members.length ? members.map((m) => m.id) : db.staff.map((s) => s.id);
    const svcs = serviceTemplates.filter((t) => picked.has(t.name)).map((t) => ({ id: uid("v"), cat: t.cat, name: t.name, price: t.price, min: t.min, staff: ids, materials: "", materialCost: 0, commission: 30, capacity: "۱ همزمان", active: true }));
    actions.saveSalon({ ...info, hours });
    actions.finishOnboarding(svcs, members);
    setDone(true);
  };

  if (done) return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <CheckCircle2 className="mx-auto text-sage" size={48} />
      <h1 className="mt-3 text-2xl font-extrabold">سالن شما آماده است 🎉</h1>
      <p className="mt-2 text-sm leading-7 text-ink2">خدمات، ساعت کاری و متخصص‌ها ثبت شد. حالا می‌توانید مشتریان را اضافه کنید یا لینک رزرو آنلاین را با آن‌ها به اشتراک بگذارید.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button onClick={() => router.push("/")}>ورود به داشبورد</Button>
        <Link href="/customers/new" className="inline-flex items-center rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2">افزودن اولین مشتری</Link>
        <Link href="/book" className="inline-flex items-center rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2">دیدن فرم رزرو آنلاین</Link>
      </div>
    </Card>
  );

  return (
    <div>
      <h1 className="mb-1 text-center text-2xl font-extrabold">راه‌اندازی سالن</h1>
      <p className="mb-5 text-center text-sm text-ink2">چهار قدم ساده تا اولین نوبت</p>
      <ol className="mb-5 grid grid-cols-4 gap-1.5">
        {steps.map((s, i) => <li key={s} className={clsx("rounded-xl px-1 py-2 text-center text-[12px] font-semibold", i === step ? "bg-rose text-white" : i < step ? "bg-rosesoft text-rosedeep" : "bg-surface2 text-ink3")}>{fa(i + 1)}. {s}</li>)}
      </ol>
      <Card className="p-5 md:p-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام سالن"><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className={fieldCls} /></Field>
            <Field label="تلفن سالن"><input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} inputMode="tel" className={fieldCls} /></Field>
            <Field label="شهر"><input value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} className={fieldCls} /></Field>
            <Field label="آدرس"><input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} className={fieldCls} /></Field>
          </div>
        )}
        {step === 1 && (
          <HoursEditor hours={hours} onChange={setHours} />
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-ink2">خدماتی که سالن ارائه می‌دهد را انتخاب کنید؛ قیمت و مدت بعداً قابل ویرایش است.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {serviceTemplates.map((t) => {
                const on = picked.has(t.name);
                return (
                  <label key={t.name} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5", on ? "border-rose bg-rosesoft" : "border-line")}>
                    <input type="checkbox" checked={on} onChange={() => { const n = new Set(picked); if (on) n.delete(t.name); else n.add(t.name); setPicked(n); }} className="size-4 accent-[#b4536f]" />
                    <span className="min-w-0 flex-1"><b className="block text-sm">{t.name}</b><span className={clsx("text-[11px]", catColor[t.cat].fg)}>{t.cat} · {fa(t.min)} دقیقه</span></span>
                    <span className="text-xs font-bold">{short(t.price)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-ink2">متخصص‌های سالن را اضافه کنید (می‌توانید بعداً اضافه کنید).</p>
            {team.map((m, i) => (
              <div key={m.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
                <input aria-label="نام متخصص" placeholder="نام و نام خانوادگی" value={m.name} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={fieldCls} />
                <input aria-label="تخصص" placeholder="تخصص (مثلاً رنگ و مش)" value={m.role} onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} className={`${fieldCls} col-span-2 sm:col-span-1`} />
                <button aria-label="حذف" onClick={() => setTeam(team.filter((_, j) => j !== i))} className="cursor-pointer justify-self-end rounded-lg p-2 text-danger hover:bg-dangersoft sm:order-last"><Trash2 size={16} /></button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => setTeam([...team, newStaff(team.length + 4)])}><Plus size={14} />متخصص دیگر</Button>
          </div>
        )}
        {err && <p role="alert" className="mt-4 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => { setErr(""); setStep(step - 1); }}><ArrowRight size={14} />قبلی</Button>
          {step < 3 ? <Button onClick={next}>بعدی<ArrowLeft size={14} /></Button> : <Button onClick={finish}>پایان و ورود به داشبورد</Button>}
        </div>
      </Card>
    </div>
  );
}
