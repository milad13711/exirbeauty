"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, BellRing, CalendarCheck, Check, Clock, Repeat, Search, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, fieldCls } from "@/components/ui";
import { actions, useDB, type DBAppt } from "@/lib/db";
import { schedule } from "@/lib/schedule";
import { newCustomer } from "@/lib/factories";
import { digits } from "@/lib/validate";
import { catColor, NOW_MIN } from "@/lib/mock";
import { clock, eligibleStaff, freeStarts, staffWorks, svcOf } from "@/lib/booking";
import { dayInfo } from "@/lib/dates";
import { fa, short } from "@/lib/fa";

type Mode = "public" | "staff";
export type Initial = { staff?: string; day?: number; start?: number; service?: string; move?: string };
const steps = ["خدمت", "متخصص", "زمان", "اطلاعات"] as const;
const repeats = [{ k: "none", l: "بدون تکرار", gap: 0 }, { k: "w1", l: "هر هفته", gap: 7 }, { k: "w2", l: "هر ۲ هفته", gap: 14 }, { k: "m1", l: "هر ماه", gap: 28 }] as const;

export function BookingWizard({ mode, initial = {} }: { mode: Mode; initial?: Initial }) {
  const db = useDB();
  const staff = db.staff.filter((s) => s.active);
  const customers = db.customers;
  const moving = initial.move ? db.appts.find((a) => a.id === initial.move) : undefined;
  const movingSvc = moving ? db.services.find((x) => x.name === moving.service) : undefined;
  const lockedStaff = !moving && initial.staff && staff.some((s) => s.id === initial.staff) ? initial.staff : null;
  const [step, setStep] = useState(moving ? 2 : initial.service && initial.start !== undefined ? 3 : 0);
  const [service, setService] = useState(movingSvc?.id ?? initial.service ?? "");
  const [who, setWho] = useState<string>(moving?.staffId ?? lockedStaff ?? "any");
  const [day, setDay] = useState(moving ? moving.day : initial.day ?? 0);
  const [slot, setSlot] = useState<{ start: number; staffId: string } | null>(initial.start !== undefined && lockedStaff ? { start: initial.start, staffId: lockedStaff } : null);
  const [q, setQ] = useState("");
  const [pickedCustomer, setPickedCustomer] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(mode === "public");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState(true);
  const [repeat, setRepeat] = useState<(typeof repeats)[number]["k"]>("none");
  const [count, setCount] = useState(4);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const [err, setErr] = useState("");
  const [moved, setMoved] = useState(false);
  const [wait, setWait] = useState({ name: "", phone: "", sent: false, err: "" });

  const svc = service ? svcOf(db, service) ?? null : null;
  const canDo = (id: string) => (lockedStaff ? !!svcOf(db, id)?.staff.includes(lockedStaff) : true);
  const cats = ["مو", "پوست", "ناخن", "آرایش"] as const;
  const candidates = useMemo(() => (svc ? (who === "any" ? eligibleStaff(db, svc.id) : eligibleStaff(db, svc.id).filter((s) => s.id === who)) : []), [db, svc, who]);
  const info = dayInfo(day);

  // ساعت‌های خالی؛ برای «هر متخصص» اولین متخصص آزاد هر ساعت انتخاب می‌شود
  const slots = useMemo(() => {
    if (!svc) return [];
    const map = new Map<number, string>();
    for (const s of candidates) for (const st of freeStarts(db, s.id, day, svc.min, [], moving?.id)) {
        if (mode === "public" && day === 0 && st < NOW_MIN + db.salon.online.leadHours * 60) continue; // حداقل فاصله تا نوبت
        if (!map.has(st)) map.set(st, s.id);
      }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [db, svc, candidates, day, mode, moving]);

  const slotStaff = slot ? staff.find((s) => s.id === slot.staffId)! : null;
  const customerName = isNew ? name.trim() : pickedCustomer ?? "";
  const infoOk = customerName.length > 1 && (mode === "staff" && !isNew ? true : /^[0-9۰-۹]{10,11}$/.test(phone.replace(/\s/g, "")));
  const ok = [!!svc, !!svc, !!slot, infoOk][step];
  const matches = customers.filter((c) => c.name.includes(q.trim()) || c.phone.replace(/\s/g, "").includes(q.trim())).slice(0, 4);

  const submit = () => {
    if (!svc || !slot) return;
    if (moving) { schedule.moveAppt(moving.id, { day, start: slot.start, staffId: slot.staffId }); setMoved(true); setDone({ created: 1, skipped: 0 }); return; }
    // مشتری در CRM: پیدا کردن با موبایل یا ساختن خودکار
    const phoneKey = digits(phone).replace(/\s/g, "");
    let cust = !isNew && mode === "staff" ? customers.find((c) => c.name === pickedCustomer) : customers.find((c) => digits(c.phone).replace(/\s/g, "") === phoneKey);
    if (!cust) { cust = { ...newCustomer(), name: customerName, phone, tags: [mode === "public" ? "رزرو آنلاین" : "ثبت پذیرش"] }; actions.saveCustomer(cust); }
    const gap = repeats.find((r) => r.k === repeat)!.gap;
    const total = mode === "staff" && gap ? count : 1;
    const list: DBAppt[] = [];
    let skipped = 0;
    for (let i = 0; i < total; i++) {
      const d = day + i * gap;
      const conflict = freeStarts(db, slot.staffId, d, svc.min, list);
      if (!conflict.includes(slot.start)) { skipped++; continue; }
      list.push({ customerId: cust.id, id: `b${Date.now().toString(36)}${i}`, staffId: slot.staffId, start: slot.start, dur: svc.min, client: customerName, service: svc.name, cat: svc.cat, status: mode === "staff" || db.salon.online.autoConfirm ? "confirmed" : "pending", day: d });
    }
    if (!list.length) { setErr("این ساعت دیگر خالی نیست؛ لطفاً زمان دیگری انتخاب کنید."); setSlot(null); setStep(2); return; }
    setErr("");
    actions.addAppts(list);
    setDone({ created: list.length, skipped });
  };

  if (done) return (
    <Card className="mx-auto max-w-lg p-7 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-sagesoft text-sage"><CalendarCheck size={28} /></span>
      <h2 className="mt-4 text-xl font-extrabold">{moved ? "نوبت جابه‌جا شد" : mode === "public" ? (db.salon.online.autoConfirm ? "نوبت شما تأیید شد" : "درخواست نوبت شما ثبت شد") : "نوبت ثبت شد"}</h2>
      {svc && slotStaff && <p className="mt-2 text-sm leading-7 text-ink2">{svc.name} · {slotStaff.name}<br />{info.full} · ساعت {clock(slot!.start)}</p>}
      {done.created > 1 && <p className="mt-2 text-sm text-ink2">{fa(done.created)} نوبت تکرارشونده ثبت شد.</p>}
      {done.skipped > 0 && <p className="mt-2 rounded-xl bg-ambersoft p-2.5 text-xs text-amber">{fa(done.skipped)} نوبت به‌دلیل تداخل با نوبت دیگر ثبت نشد.</p>}
      <p className="mt-3 text-xs text-ink3">{mode === "public" ? (db.salon.online.autoConfirm ? "پیامک تأیید برای شما ارسال می‌شود." : "پس از تأیید سالن، پیامک برای شما ارسال می‌شود.") : "یادآوری خودکار برای مشتری فعال است."}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {mode === "staff" && <Link href="/calendar" className="rounded-xl bg-rose px-4 py-2.5 text-[13px] font-semibold text-white">مشاهده در تقویم</Link>}
        <Button variant="ghost" onClick={() => { setDone(null); setMoved(false); setStep(0); setService(""); setSlot(null); setName(""); setPhone(""); setPickedCustomer(null); setNote(""); setRepeat("none"); }}>ثبت نوبت دیگر</Button>
      </div>
    </Card>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <ol className={clsx("mb-5 grid grid-cols-4 gap-1.5", moving && "hidden")} aria-label="مراحل رزرو">
          {steps.map((s, i) => (
            <li key={s} className={clsx("rounded-xl px-1 py-2 text-center text-[12px] font-semibold", i === step ? "bg-rose text-white" : i < step ? "bg-rosesoft text-rosedeep" : "bg-surface2 text-ink3")}>
              <span className="ml-1">{fa(i + 1)}.</span>{s}
            </li>
          ))}
        </ol>

        <Card className="p-5">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="font-bold">چه خدمتی می‌خواهید؟</h2>
              {cats.map((c) => (
                <section key={c}>
                  <p className={clsx("mb-2 text-xs font-bold", catColor[c].fg)}>{c}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {db.services.filter((s) => s.active && s.cat === c && canDo(s.id) && s.staff.length > 0).map((s) => (
                      <button key={s.id} onClick={() => { setService(s.id); setSlot(null); if (!lockedStaff) setWho("any"); }} aria-pressed={service === s.id} className={clsx("flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-right", service === s.id ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                        <span><b className="block text-sm">{s.name}</b><span className="text-xs text-ink3">{fa(s.min)} دقیقه</span></span>
                        <b className="text-sm">{short(s.price)}</b>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {step === 1 && svc && (
            <div className="space-y-3">
              <h2 className="font-bold">نزد کدام متخصص؟</h2>
              {!lockedStaff && (
                <button onClick={() => { setWho("any"); setSlot(null); }} aria-pressed={who === "any"} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-right", who === "any" ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                  <span className="grid size-10 place-items-center rounded-full bg-plum text-white">✦</span>
                  <span><b className="block text-sm">هر متخصص</b><span className="text-xs text-ink3">نزدیک‌ترین وقت خالی نمایش داده می‌شود</span></span>
                </button>
              )}
              {eligibleStaff(db, svc.id).filter((s) => !lockedStaff || s.id === lockedStaff).map((s) => (
                <button key={s.id} onClick={() => { setWho(s.id); setSlot(null); }} aria-pressed={who === s.id} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-right", who === s.id ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                  <Avatar name={s.name} color={s.color} size={40} />
                  <span className="min-w-0 flex-1"><b className="block text-sm">{s.name}</b><span className="text-xs text-ink3">{s.role}</span></span>
                  <span className="text-xs font-bold text-gold">★ {fa(s.rating)}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && svc && (
            <div className="space-y-4">
              <h2 className="font-bold">{moving ? `جابه‌جایی نوبت ${moving.client}` : "چه روز و ساعتی؟"}</h2>
              {moving && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface2 p-3 text-sm">
                  <span>نوبت فعلی: <b>{dayInfo(moving.day).short} · {clock(moving.start)}</b> ({moving.service})</span>
                  <select aria-label="متخصص" value={who} onChange={(e) => { setWho(e.target.value); setSlot(null); }} className={`${fieldCls} !w-auto !py-1.5`}>
                    <option value="any">هر متخصص</option>
                    {svc && eligibleStaff(db, svc.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              {err && <p role="alert" className="rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7" role="radiogroup" aria-label="روز">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = dayInfo(i);
                  const closed = candidates.every((s) => !staffWorks(db, s.id, i));
                  return (
                    <button key={i} role="radio" aria-checked={day === i} disabled={closed} onClick={() => { setDay(i); setSlot(null); }} className={clsx("cursor-pointer rounded-xl border px-1 py-2 text-center text-[12px] leading-5 disabled:cursor-not-allowed disabled:opacity-40", day === i ? "border-rose bg-rose text-white" : "border-line hover:bg-surface2")}>
                      <b className="block">{i === 0 ? "امروز" : d.weekday}</b>{d.short}{closed && <span className="block text-[10px]">{db.salon.hours[d.idx].open ? "پر/مرخصی" : "تعطیل"}</span>}
                    </button>
                  );
                })}
              </div>
              {slots.length ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="ساعت">
                  {slots.map(([st, sid]) => {
                    const on = slot?.start === st;
                    return <button key={st} role="radio" aria-checked={on} onClick={() => setSlot({ start: st, staffId: sid })} className={clsx("cursor-pointer rounded-xl border py-2.5 text-sm font-bold", on ? "border-rose bg-rosesoft text-rosedeep ring-1 ring-rose" : "border-line hover:bg-surface2")}>{clock(st)}</button>;
                  })}
                </div>
              ) : (
                <div className="space-y-3 rounded-xl bg-surface2 p-4 text-sm text-ink2">
                  <p className="text-center">در این روز وقت خالی وجود ندارد؛ روز دیگری را انتخاب کنید یا به لیست انتظار بپیوندید.</p>
                  {!moving && (wait.sent ? <p className="rounded-lg bg-sagesoft p-2.5 text-center text-xs text-sage">به لیست انتظار اضافه شدید؛ با خالی شدن وقت، سالن با شما تماس می‌گیرد.</p> : (
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input aria-label="نام برای لیست انتظار" placeholder="نام و نام خانوادگی" value={wait.name} onChange={(e) => setWait({ ...wait, name: e.target.value })} className={fieldCls} />
                      <input aria-label="موبایل برای لیست انتظار" placeholder="09123456789" dir="ltr" style={{ textAlign: "right" }} value={wait.phone} onChange={(e) => setWait({ ...wait, phone: e.target.value })} className={fieldCls} />
                      <Button onClick={() => { if (wait.name.trim().length < 3 || !/^09\d{9}$/.test(digits(wait.phone).replace(/\s/g, ""))) return setWait({ ...wait, err: "نام و موبایل معتبر را وارد کنید." }); schedule.addWait({ name: wait.name.trim(), phone: wait.phone, serviceId: svc!.id, staffId: who, from: day, to: Math.min(day + 3, 13), note: "از فرم رزرو" }); setWait({ ...wait, sent: true, err: "" }); }}>پیوستن به لیست انتظار</Button>
                      {wait.err && <p role="alert" className="text-xs text-danger sm:col-span-3">{wait.err}</p>}
                    </div>
                  ))}
                </div>
              )}
              {day === 0 && <p className="text-xs text-ink3">ساعت‌های گذشته‌ی امروز نمایش داده نمی‌شوند.</p>}
              {who === "any" && slot && slotStaff && <p className="text-xs text-ink2">متخصص این ساعت: <b>{slotStaff.name}</b></p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold">{mode === "public" ? "اطلاعات شما" : "مشتری"}</h2>
              {mode === "staff" && (
                <div className="flex gap-2">
                  <Button variant={isNew ? "ghost" : "soft"} onClick={() => setIsNew(false)}><Search size={14} />مشتری موجود</Button>
                  <Button variant={isNew ? "soft" : "ghost"} onClick={() => { setIsNew(true); setPickedCustomer(null); }}><UserPlus size={14} />مشتری جدید</Button>
                </div>
              )}
              {!isNew && mode === "staff" ? (
                <>
                  <input aria-label="جستجوی مشتری" value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره‌ی مشتری…" className={fieldCls} />
                  <ul className="space-y-1.5">
                    {matches.map((c) => (
                      <li key={c.id}><button onClick={() => setPickedCustomer(c.name)} aria-pressed={pickedCustomer === c.name} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-right", pickedCustomer === c.name ? "border-rose bg-rosesoft" : "border-line hover:bg-surface2")}>
                        <Avatar name={c.name} size={32} /><span className="min-w-0 flex-1"><b className="block text-sm">{c.name}</b><bdi dir="ltr" className="text-xs text-ink3">{c.phone}</bdi></span>{pickedCustomer === c.name && <Check size={16} className="text-rose" />}
                      </button></li>
                    ))}
                  </ul>
                  {pickedCustomer === "سارا محمدی" && <p className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">⚠️ حساسیت به PPD؛ در پرونده‌ی زیبایی ثبت است.</p>}
                </>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} autoComplete="name" /></Field>
                  <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} autoComplete="tel" /></Field>
                </div>
              )}
              <Field label="توضیحات (اختیاری)"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "public" ? "مثلاً رنگ موردنظر یا حساسیت‌ها" : "نکته برای متخصص"} className={fieldCls} /></Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="size-4 accent-[#b4536f]" /><BellRing size={15} className="text-rose" />یادآوری پیامکی ۲۴ ساعت و ۲ ساعت قبل</label>
              {mode === "staff" && (
                <div className="rounded-xl border border-line p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink2"><Repeat size={14} />نوبت تکرارشونده</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="تکرار" value={repeat} onChange={(e) => setRepeat(e.target.value as typeof repeat)} className={`${fieldCls} !w-auto`}>{repeats.map((r) => <option key={r.k} value={r.k}>{r.l}</option>)}</select>
                    {repeat !== "none" && <label className="flex items-center gap-2 text-sm">به تعداد<input type="number" min={2} max={12} value={count} onChange={(e) => setCount(Math.min(12, Math.max(2, +e.target.value || 2)))} className={`${fieldCls} !w-16 text-center`} />نوبت</label>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2 border-t border-line pt-4">
            {moving ? <Button variant="ghost" onClick={() => history.back()}>انصراف</Button> : <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowRight size={14} />قبلی</Button>}
            {moving ? <Button disabled={!slot} onClick={submit}><Check size={14} />تأیید جابه‌جایی</Button> : step < 3 ? <Button disabled={!ok} onClick={() => setStep(step + 1)}>بعدی<ArrowLeft size={14} /></Button> : <Button disabled={!ok} onClick={submit}><Check size={14} />{mode === "public" ? "ثبت درخواست نوبت" : "ثبت نوبت"}</Button>}
          </div>
        </Card>
      </div>

      <Card className="p-5 lg:sticky lg:top-24">
        <h3 className="mb-3 text-sm font-bold">خلاصه‌ی نوبت</h3>
        {svc ? (
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink3">خدمت</dt><dd className="font-semibold">{svc.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink3">مدت</dt><dd className="inline-flex items-center gap-1"><Clock size={13} />{fa(svc.min)} دقیقه</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink3">متخصص</dt><dd>{slotStaff?.name ?? (who === "any" ? "هر متخصص" : staff.find((s) => s.id === who)?.name)}</dd></div>
            {slot && <div className="flex justify-between gap-3"><dt className="text-ink3">زمان</dt><dd className="text-left font-semibold">{info.short} · {clock(slot.start)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2.5"><dt className="text-ink3">هزینه‌ی تقریبی</dt><dd><b>{short(svc.price)}</b> تومان</dd></div>
          </dl>
        ) : <p className="text-sm text-ink3">هنوز خدمتی انتخاب نشده است.</p>}
        {mode === "public" && !db.salon.online.autoConfirm && <p className="mt-3"><Badge tone="amber">پس از ثبت، منتظر تأیید سالن باشید</Badge></p>}
      </Card>
    </div>
  );
}
