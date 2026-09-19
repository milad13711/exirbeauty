"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Bell, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Coffee, Hourglass, Plus, Repeat, Sparkles, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, LinkButton, PageTitle, fieldCls, type Tone } from "@/components/ui";
import { actions, useDB, type StaffMember } from "@/lib/db";
import { dayInfo } from "@/lib/dates";
import { NOW_MIN, smartSuggestions, type Appt } from "@/lib/mock";
import { clock, dayLoad, findSlot, offReason, svcOf, workWindow } from "@/lib/booking";
import { schedule } from "@/lib/schedule";
import { digits } from "@/lib/validate";
import { fa, short } from "@/lib/fa";

const MIN_GAP = 45;
const range = (s: number, d: number) => `${clock(s)} تا ${clock(s + d)}`;

const status: Record<Appt["status"], { l: string; t: Tone }> = {
  inservice: { l: "در حال انجام", t: "rose" },
  confirmed: { l: "تأییدشده", t: "sage" },
  pending: { l: "منتظر تأیید", t: "amber" },
  done: { l: "انجام‌شده", t: "neutral" },
};

type Item =
  | { kind: "appt"; start: number; a: Appt }
  | { kind: "break"; start: number; dur: number; label: string }
  | { kind: "free"; start: number; dur: number }
  | { kind: "now"; start: number };

function timeline(m: StaffMember, win: [number, number], dayAppts: Appt[], showNow: boolean): Item[] {
  const mine = dayAppts.filter((a) => a.staffId === m.id);
  const busy = [...mine.map((a) => ({ s: a.start, e: a.start + a.dur })), ...m.breaks.map((b) => ({ s: b.s, e: b.e }))].sort((x, y) => x.s - y.s);
  const items: Item[] = [...mine.map((a): Item => ({ kind: "appt", start: a.start, a })), ...m.breaks.map((b): Item => ({ kind: "break", start: b.s, dur: b.e - b.s, label: b.label }))];
  let cur = win[0];
  for (const b of busy) {
    if (b.s - cur >= MIN_GAP) items.push({ kind: "free", start: cur, dur: b.s - cur });
    cur = Math.max(cur, b.e);
  }
  if (win[1] - cur >= MIN_GAP) items.push({ kind: "free", start: cur, dur: win[1] - cur });
  if (showNow) items.push({ kind: "now", start: NOW_MIN - 0.5 });
  return items.sort((x, y) => x.start - y.start);
}

const views = [{ k: "day", l: "روز" }, { k: "week", l: "هفته" }, { k: "smart", l: "پیشنهاد" }, { k: "wait", l: "انتظار" }] as const;

function ApptRow({ a, open, onToggle }: { a: Appt; open: boolean; onToggle: () => void }) {
  const s = status[a.status];
  return (
    <li className={clsx("rounded-xl border border-line bg-surface", a.status === "done" && "bg-surface2/60")}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-right">
        <span className="w-[74px] shrink-0 text-[12px] leading-5 text-ink2"><b className="block text-ink">{clock(a.start)}</b>{fa(a.dur)} دقیقه</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">{a.client}</b><span className="block truncate text-xs text-ink3">{a.service}</span></span>
        <Badge tone={s.t}>{s.l}</Badge>
        <ChevronDown size={16} className={clsx("shrink-0 text-ink3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          {a.client === "سارا محمدی" && <p className="mb-3 rounded-lg bg-dangersoft p-2.5 text-xs leading-6 text-danger">⚠️ حساسیت به PPD؛ از رنگ‌های بدون PPD استفاده شود.</p>}
          <p className="mb-3 text-xs text-ink2">{range(a.start, a.dur)}</p>
          <div className="flex flex-wrap gap-2">
            {a.status === "pending" && <Button variant="soft" onClick={() => actions.setApptStatus(a.id, "confirmed")}>تأیید</Button>}
            {a.status !== "done" && <LinkButton href={`/calendar/new?move=${a.id}`} variant="ghost">جابه‌جایی</LinkButton>}
            {a.status !== "done" && <LinkButton href={`/cashier?appt=${a.id}`} variant="ghost">صدور فاکتور</LinkButton>}
            <Button variant="ghost" className="!text-danger" onClick={() => actions.cancelAppt(a.id)}>لغو نوبت</Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink3"><Bell size={12} />یادآوری خودکار ۲۴ ساعت و ۲ ساعت قبل</p>
        </div>
      )}
    </li>
  );
}

function WeekView({ onPick }: { onPick: (d: number) => void }) {
  const db = useDB();
  const [week, setWeek] = useState(0);
  const days = Array.from({ length: 7 }, (_, i) => week * 7 + i);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2.5">
        <button aria-label="هفته قبل" disabled={week === 0} onClick={() => setWeek(week - 1)} className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
        <span className="text-sm font-extrabold">{dayInfo(days[0]).short} تا {dayInfo(days[6]).short}</span>
        <button aria-label="هفته بعد" onClick={() => setWeek(week + 1)} className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2"><ChevronLeft size={16} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {days.map((d) => {
          const info = dayInfo(d), load = dayLoad(db, d);
          const shown = [...load.list].sort((a, b) => a.start - b.start);
          return (
            <button key={d} onClick={() => onPick(d)} className={clsx("cursor-pointer rounded-2xl border bg-surface p-4 text-right transition-shadow hover:shadow-md", d === 0 ? "border-rose ring-1 ring-rose" : "border-line", !load.open && "opacity-60")}>
              <div className="flex items-center justify-between"><b className="text-sm">{d === 0 ? "امروز" : info.weekday} · {info.short}</b>{load.open ? <Badge tone={load.pct >= 80 ? "danger" : load.pct >= 50 ? "amber" : "sage"}>{fa(load.pct)}٪ پُر</Badge> : <Badge>تعطیل</Badge>}</div>
              {load.open ? (
                <>
                  <div className="mt-3 h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-rose" style={{ width: `${load.pct}%` }} /></div>
                  <p className="mt-2 text-xs text-ink2">{fa(load.list.length)} نوبت · {fa(Math.max(0, Math.round((load.capacity - load.booked) / 60)))} ساعت ظرفیت خالی</p>
                  <ul className="mt-2 space-y-0.5 text-xs text-ink3">
                    {shown.slice(0, 3).map((a) => <li key={a.id} className="truncate">{clock(a.start)} · {a.client} — {a.service}</li>)}
                    {shown.length > 3 && <li>و {fa(shown.length - 3)} نوبت دیگر…</li>}
                  </ul>
                </>
              ) : <p className="mt-3 text-xs text-ink3">هیچ متخصصی در دسترس نیست.</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WaitView() {
  const db = useDB();
  const [f, setF] = useState({ name: "", phone: "", serviceId: db.services.find((s) => s.active)?.id ?? "", staffId: "any", from: 0, to: 3, note: "" });
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const active = db.waitlist.filter((w) => w.status === "منتظر" || w.status === "اطلاع داده شد");
  const closed = db.waitlist.filter((w) => w.status === "رزرو شد" || w.status === "لغو");
  const tone: Record<string, Tone> = { "منتظر": "amber", "اطلاع داده شد": "sky", "رزرو شد": "sage", "لغو": "neutral" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink2">{fa(active.length)} نفر در لیست انتظار</p>
        <Button variant="soft" onClick={() => setOpen(!open)}><Plus size={14} />افزودن به لیست</Button>
      </div>
      {open && (
        <Card className="p-5">
          <form onSubmit={(e) => { e.preventDefault(); if (f.name.trim().length < 3) return setErr("نام را وارد کنید."); if (!/^09\d{9}$/.test(digits(f.phone).replace(/\s/g, ""))) return setErr("موبایل معتبر نیست."); if (f.to < f.from) return setErr("بازه‌ی روزها نادرست است."); schedule.addWait({ ...f, name: f.name.trim() }); setF({ ...f, name: "", phone: "", note: "" }); setErr(""); setOpen(false); }} className="grid gap-3 sm:grid-cols-2">
            <Field label="نام"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={fieldCls} /></Field>
            <Field label="موبایل"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            <Field label="خدمت"><select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })} className={fieldCls}>{db.services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="متخصص"><select value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value })} className={fieldCls}><option value="any">هر متخصص</option>{db.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="از روز"><select value={f.from} onChange={(e) => setF({ ...f, from: +e.target.value, to: Math.max(f.to, +e.target.value) })} className={fieldCls}>{Array.from({ length: 14 }, (_, i) => <option key={i} value={i}>{i === 0 ? "امروز" : `${dayInfo(i).weekday} ${dayInfo(i).short}`}</option>)}</select></Field>
            <Field label="تا روز"><select value={f.to} onChange={(e) => setF({ ...f, to: +e.target.value })} className={fieldCls}>{Array.from({ length: 14 }, (_, i) => i).filter((i) => i >= f.from).map((i) => <option key={i} value={i}>{i === 0 ? "امروز" : `${dayInfo(i).weekday} ${dayInfo(i).short}`}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="توضیح (اختیاری)"><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="مثلاً ترجیحاً عصر" className={fieldCls} /></Field></div>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
            <div className="flex gap-2 sm:col-span-2"><Button type="submit">ثبت</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>انصراف</Button></div>
          </form>
        </Card>
      )}
      <ul className="space-y-3">
        {active.map((w) => {
          const sv = svcOf(db, w.serviceId);
          const slot = findSlot(db, w);
          const st = slot && db.staff.find((s) => s.id === slot.staffId);
          return (
            <li key={w.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Hourglass size={18} className="shrink-0 text-amber" />
                  <div className="min-w-0 flex-1 basis-40"><b className="block text-sm">{w.name}</b><span className="text-xs text-ink3">{sv?.name ?? "—"} · {w.staffId === "any" ? "هر متخصص" : db.staff.find((s) => s.id === w.staffId)?.name} · {w.from === 0 ? "از امروز" : dayInfo(w.from).short} تا {dayInfo(w.to).short}{w.note && ` · ${w.note}`}</span></div>
                  <Badge tone={tone[w.status]}>{w.status}</Badge>
                  <button aria-label={`حذف ${w.name}`} onClick={() => schedule.removeWait(w.id)} className="cursor-pointer rounded-lg p-1.5 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
                </div>
                <div className={clsx("mt-3 flex flex-wrap items-center gap-2 rounded-xl p-3 text-sm", slot ? "bg-sagesoft" : "bg-surface2")}>
                  {slot && st ? (
                    <>
                      <span className="min-w-0 flex-1 basis-48 text-sage">جای خالی پیدا شد: <b>{dayInfo(slot.day).weekday} {dayInfo(slot.day).short} · {clock(slot.start)}</b> با {st.name}</span>
                      <Button onClick={() => schedule.bookFromWait(w.id, slot)}>رزرو این وقت</Button>
                      {w.status === "منتظر" && <Button variant="ghost" onClick={() => schedule.setWaitStatus(w.id, "اطلاع داده شد")}>اطلاع دادم</Button>}
                    </>
                  ) : <span className="text-ink2">هنوز وقت خالی مناسبی در این بازه نیست.</span>}
                </div>
              </Card>
            </li>
          );
        })}
        {!active.length && <p className="py-10 text-center text-sm text-ink3">لیست انتظار خالی است.</p>}
      </ul>
      {closed.length > 0 && <p className="text-xs text-ink3">{fa(closed.length)} مورد رزرو یا لغو شده: {closed.map((w) => w.name).join("، ")}</p>}
    </div>
  );
}

export default function CalendarPage() {
  const db = useDB();
  const [day, setDay] = useState(0);
  const info = dayInfo(day);
  const dayAppts = db.appts.filter((a) => a.day === day);
  const [who, setWho] = useState("all");
  const [view, setView] = useState<(typeof views)[number]["k"]>("day");
  const [open, setOpen] = useState<string | null>("a3");
  const cols = db.staff.filter((s) => s.active && (who === "all" || s.id === who));
  const total = dayAppts.filter((a) => who === "all" || a.staffId === who).length;
  const waiting = db.waitlist.filter((w) => w.status === "منتظر").length;

  return (
    <>
      <PageTitle title="تقویم و نوبت‌دهی" actions={<><LinkButton href="/calendar/new" variant="ghost"><Repeat size={14} />تکرارشونده</LinkButton><LinkButton href="/calendar/new"><Plus size={14} />نوبت جدید</LinkButton></>} />

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-surface2 p-1" role="tablist">
          {views.map((v) => (
            <button key={v.k} role="tab" aria-selected={view === v.k} onClick={() => setView(v.k)} className={clsx("cursor-pointer rounded-lg px-1.5 py-2 text-[13px] font-bold", view === v.k ? "bg-surface text-rosedeep shadow-sm" : "text-ink2")}>
              {v.l}{v.k === "smart" && ` (${fa(smartSuggestions.length)})`}{v.k === "wait" && waiting > 0 && ` (${fa(waiting)})`}
            </button>
          ))}
        </div>

        {view === "day" && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <div className="flex items-center gap-1">
                <button aria-label="روز قبل" disabled={day === 0} onClick={() => setDay(day - 1)} className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
                <span className="px-2 text-sm font-extrabold">{info.full}</span>{day > 0 && <button onClick={() => setDay(0)} className="mr-1 cursor-pointer rounded-lg bg-rosesoft px-2.5 py-1 text-xs font-bold text-rosedeep">امروز</button>}
                <button aria-label="روز بعد" onClick={() => setDay(day + 1)} className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2"><ChevronLeft size={16} /></button>
              </div>
              <select aria-label="متخصص" value={who} onChange={(e) => setWho(e.target.value)} className="mr-auto cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold">
                <option value="all">همه‌ی متخصص‌ها</option>
                {db.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-6">
              <p className="text-sm text-ink2"><b className="text-ink">{fa(total)}</b> نوبت{day === 0 && <> امروز · ساعت <b className="text-ink">{clock(NOW_MIN)}</b> اکنون</>}</p>
              {cols.map((s) => (
                <section key={s.id}>
                  <header className="mb-2 flex items-center gap-2.5"><Avatar name={s.name} color={s.color} size={30} /><div className="leading-tight"><h2 className="text-sm font-extrabold">{s.name}</h2><p className="text-[11px] text-ink3">{s.role}</p></div></header>
                  <ul className="space-y-2">
                    {!workWindow(db, s, day) ? <li className="rounded-xl border border-dashed border-line px-4 py-3 text-xs text-ink3">{offReason(db, s, day)}</li> : timeline(s, workWindow(db, s, day)!, dayAppts, day === 0).map((it, i) => {
                      if (it.kind === "appt") return <ApptRow key={it.a.id} a={it.a} open={open === it.a.id} onToggle={() => setOpen(open === it.a.id ? null : it.a.id)} />;
                      if (it.kind === "now") return <li key={`n${i}`} className="flex items-center gap-2 text-[11px] font-bold text-danger" aria-label="اکنون"><span className="h-px flex-1 bg-danger/40" />اکنون {clock(NOW_MIN)}<span className="h-px flex-1 bg-danger/40" /></li>;
                      if (it.kind === "break") return <li key={`b${i}`} className="flex items-center gap-2 px-4 py-1.5 text-xs text-ink3"><Coffee size={13} />{it.label} · {range(it.start, it.dur)}</li>;
                      return (
                        <li key={`f${i}`}><Link href={`/calendar/new?staff=${s.id}&day=${day}&start=${it.start}`} className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed border-line px-4 py-2.5 text-xs text-ink2 hover:bg-rosesoft/50"><span>خالی · {range(it.start, it.dur)}</span><span className="inline-flex items-center gap-1 font-bold text-rose"><Plus size={13} />نوبت</span></Link></li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}

        {view === "week" && <WeekView onPick={(d) => { setDay(d); setView("day"); }} />}

        {view === "smart" && (
          <Card>
            <p className="flex items-center gap-2 px-5 pt-4 text-xs text-ink2"><Sparkles size={14} className="text-rose" />بر اساس چرخه‌ی مراجعه‌ی هر مشتری</p>
            <ul className="divide-y divide-line">
              {smartSuggestions.map((g) => (
                <li key={g.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-bold">{g.name} <span className="font-medium text-rosedeep">· {g.reason}</span></p><span className="shrink-0 text-xs font-bold text-sage">{short(g.value)}</span></div>
                  <p className="mt-1 text-xs leading-6 text-ink2">{g.detail}</p>
                  <div className="mt-2 flex items-center justify-between gap-2"><Badge tone="sky"><CalendarClock size={11} />{g.slot} · {g.staff.split(" ")[0]}</Badge><button className="cursor-pointer text-[13px] font-semibold text-rose hover:text-rosedeep">ارسال پیشنهاد</button></div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {view === "wait" && <WaitView />}
      </div>
    </>
  );
}
