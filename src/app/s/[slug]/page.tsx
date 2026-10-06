"use client";
import { use, useMemo, useState } from "react";
import clsx from "clsx";
import { CalendarCheck, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { Chip, ErrorNote, Spinner } from "@/components/live/ui";
import { ApiError, errorText } from "@/lib/api";
import { crm, type Receipt } from "@/lib/crmApi";
import { addDays, faDate, faNum, fmtMin, todayLocal, toman } from "@/lib/fmt";
import { digits, isPhone } from "@/lib/validate";
import { useQuery } from "@/lib/useQuery";

const STEPS = ["خدمت", "متخصص", "زمان", "اطلاعات"] as const;
const ANY = "any";

function Wizard({ slug }: { slug: string }) {
  const salon = useQuery(() => crm.publicSalon(slug), [slug]);
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [who, setWho] = useState(ANY);
  const [date, setDate] = useState(todayLocal());
  const [time, setTime] = useState<number | null>(null);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Receipt | null>(null);
  const [wait, setWait] = useState<"idle" | "sent">("idle");

  const data = salon.data;
  const svc = data?.services.find((s) => s.id === serviceId);
  const people = useMemo(() => data?.staff.filter((s) => svc?.staffIds.includes(s.id)) ?? [], [data, svc]);
  const avail = useQuery(() => (step === 2 && serviceId ? crm.publicAvailability(slug, { serviceId, date, staffId: who === ANY ? undefined : who }) : Promise.resolve(null)), [step, serviceId, date, who]);
  const times = useMemo(() => [...new Set((avail.data?.staff ?? []).flatMap((s) => s.starts))].sort((a, b) => a - b), [avail.data]);
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayLocal(), i));

  if (salon.loading && !data) return <Spinner />;
  if (!data) {
    const e = salon.error;
    const blocked = e instanceof ApiError && (e.status === 403 || e.status === 404);
    return <Card className="mx-auto max-w-md p-7 text-center"><h1 className="text-lg font-extrabold">{blocked ? "رزرو آنلاین در دسترس نیست" : "خطا در بارگذاری"}</h1><p className="mt-2 text-sm leading-7 text-ink2">{blocked ? "این سالن رزرو آنلاین ندارد یا آدرس درست نیست. لطفاً مستقیم با سالن تماس بگیرید." : errorText(e)}</p></Card>;
  }

  async function submit() {
    if (name.trim().length < 2) return setErr("نام را وارد کنید.");
    if (!isPhone(phone)) return setErr("شماره موبایل معتبر نیست.");
    if (time === null) return;
    setBusy(true); setErr("");
    try { setDone(await crm.publicBook(slug, { serviceId, staffId: who === ANY ? undefined : who, date, startMin: time, name: name.trim(), phone: digits(phone).replace(/[\s-]/g, ""), note: note.trim() })); }
    catch (e) {
      setErr(errorText(e));
      if (e instanceof ApiError && e.code === "SLOT_TAKEN") { setTime(null); setStep(2); void avail.reload(); }
    } finally { setBusy(false); }
  }
  async function joinWait() {
    if (name.trim().length < 2 || !isPhone(phone)) return setErr("برای لیست انتظار، نام و موبایل معتبر لازم است.");
    setBusy(true); setErr("");
    try { await crm.publicWait(slug, { name: name.trim(), phone: digits(phone).replace(/[\s-]/g, ""), serviceId, staffId: who === ANY ? null : who, fromDate: date, toDate: addDays(date, 3) }); setWait("sent"); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-lg p-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-sagesoft text-sage"><CalendarCheck size={28} /></span>
        <h1 className="mt-4 text-xl font-extrabold">{done.status === "CONFIRMED" ? "نوبت شما تأیید شد" : "درخواست نوبت شما ثبت شد"}</h1>
        <p className="mt-2 text-sm leading-7 text-ink2">{done.serviceName} · {done.staffName}<br />{faDate.full(done.date.slice(0, 10))} · ساعت {fmtMin(done.startMin)}</p>
        <p className="mt-3 text-xs text-ink3">{done.status === "CONFIRMED" ? "منتظر شما هستیم." : "پس از تأیید سالن، با شما هماهنگ می‌شود."}</p>
      </Card>
    );
  }

  const cats = [...new Set(data.services.map((s) => s.category))];
  const next = () => { setErr(""); setStep((s) => s + 1); };

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-extrabold">{data.name}</h1><p className="text-sm text-ink2">{data.city}</p></div>
      <ol className="grid grid-cols-4 gap-1.5" aria-label="مراحل رزرو">
        {STEPS.map((s, i) => <li key={s} className={clsx("rounded-xl px-1 py-2 text-center text-[12px] font-semibold", i === step ? "bg-rose text-white" : i < step ? "bg-rosesoft text-rosedeep" : "bg-surface2 text-ink3")}>{faNum(i + 1)}. {s}</li>)}
      </ol>
      <Card className="p-5">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-bold">چه خدمتی می‌خواهید؟</h2>
            {cats.map((c) => (
              <section key={c}><p className="mb-2 text-xs font-bold text-rosedeep">{c}</p>
                <div className="grid gap-2 sm:grid-cols-2">{data.services.filter((s) => s.category === c).map((s) => (
                  <button key={s.id} onClick={() => { setServiceId(s.id); setWho(ANY); setTime(null); }} aria-pressed={serviceId === s.id} className={clsx("flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-right", serviceId === s.id ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                    <span><b className="block text-sm">{s.name}</b><span className="text-xs text-ink3">{faNum(s.durationMin)} دقیقه</span></span><b className="text-sm">{toman(s.price)}</b>
                  </button>))}</div>
              </section>
            ))}
            {!data.services.length && <p className="text-sm text-ink3">فعلاً خدمتی برای رزرو آنلاین وجود ندارد.</p>}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-2.5">
            <h2 className="font-bold">نزد کدام متخصص؟</h2>
            <button onClick={() => { setWho(ANY); setTime(null); }} aria-pressed={who === ANY} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-right", who === ANY ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}><span className="grid size-10 place-items-center rounded-full bg-plum text-white">✦</span><span><b className="block text-sm">هر متخصص</b><span className="text-xs text-ink3">نزدیک‌ترین وقت خالی</span></span></button>
            {people.map((p) => (
              <button key={p.id} onClick={() => { setWho(p.id); setTime(null); }} aria-pressed={who === p.id} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-right", who === p.id ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                <span className="grid size-10 place-items-center rounded-full font-extrabold text-white" style={{ background: p.color }}>{p.name[0]}</span><span className="min-w-0 flex-1"><b className="block text-sm">{p.name}</b><span className="text-xs text-ink3">{p.title}</span></span>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-bold">چه روز و ساعتی؟</h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="radiogroup" aria-label="روز">
              {days.map((d) => <button key={d} role="radio" aria-checked={date === d} onClick={() => { setDate(d); setTime(null); }} className={clsx("min-w-16 shrink-0 cursor-pointer rounded-xl border px-2 py-2 text-center text-[12px] leading-5", date === d ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line hover:bg-surface2")}><b className="block">{d === todayLocal() ? "امروز" : faDate.weekday(d)}</b>{faDate.short(d)}</button>)}
            </div>
            {avail.loading && !avail.data ? <Spinner label="در حال بررسی…" /> : avail.error ? <ErrorNote message={errorText(avail.error)} onRetry={avail.reload} /> : times.length ? (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ساعت">{times.map((t) => <Chip key={t} active={time === t} onClick={() => setTime(t)}>{fmtMin(t)}</Chip>)}</div>
            ) : (
              <div className="space-y-3 rounded-xl bg-surface2 p-4 text-sm text-ink2">
                <p>در این روز وقت خالی وجود ندارد؛ روز دیگری را انتخاب کنید یا به لیست انتظار بپیوندید.</p>
                {wait === "sent" ? <p className="rounded-lg bg-sagesoft p-2.5 text-center text-xs text-sage">به لیست انتظار اضافه شدید؛ سالن با شما تماس می‌گیرد.</p> : (
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input aria-label="نام" placeholder="نام و نام خانوادگی" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
                    <input aria-label="موبایل" placeholder="09123456789" dir="ltr" style={{ textAlign: "right" }} value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldCls} />
                    <Button onClick={joinWait} disabled={busy}>پیوستن به لیست انتظار</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold">اطلاعات شما</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} autoComplete="name" /></Field>
              <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} autoComplete="tel" /></Field>
            </div>
            <Field label="توضیحات (اختیاری)"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
          </div>
        )}
        {err && <div className="mt-4"><ErrorNote message={err} /></div>}
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-line pt-4">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronRight size={14} />قبلی</Button>
          {step < 3 ? <Button disabled={(step === 0 && !serviceId) || (step === 2 && time === null)} onClick={next}>بعدی<ChevronLeft size={14} /></Button>
            : <Button disabled={busy || time === null} onClick={submit}><Check size={14} />{busy ? "در حال ثبت…" : "ثبت درخواست نوبت"}</Button>}
        </div>
      </Card>
      {svc && time !== null && <p className="text-center text-xs text-ink3">{svc.name} · {faDate.full(date)} · {fmtMin(time)} · {toman(svc.price)}</p>}
    </div>
  );
}

export default function PublicBooking({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Wizard slug={slug} />;
}
