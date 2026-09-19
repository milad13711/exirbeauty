"use client";
import { useState } from "react";
import clsx from "clsx";
import { Bell, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Coffee, Hourglass, Plus, Repeat, Sparkles } from "lucide-react";
import { Avatar, Badge, Button, Card, PageTitle, type Tone } from "@/components/ui";
import { appts, blocked, NOW_MIN, smartSuggestions, staff, TODAY, waitlist, type Appt } from "@/lib/mock";
import { fa, short } from "@/lib/fa";

const DAY_LEN = 600; // ۹ تا ۱۹
const MIN_GAP = 45;
const clock = (m: number) => `${fa(String(9 + Math.floor(m / 60)).padStart(2, "0"))}:${fa(String(m % 60).padStart(2, "0"))}`;
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

function timeline(staffId: string): Item[] {
  const busy = [
    ...appts.filter((a) => a.staffId === staffId).map((a) => ({ s: a.start, e: a.start + a.dur })),
    ...(blocked[staffId] ?? []).map((b) => ({ s: b.s, e: b.e })),
  ].sort((x, y) => x.s - y.s);
  const items: Item[] = [
    ...appts.filter((a) => a.staffId === staffId).map((a): Item => ({ kind: "appt", start: a.start, a })),
    ...(blocked[staffId] ?? []).map((b): Item => ({ kind: "break", start: b.s, dur: b.e - b.s, label: b.label })),
  ];
  let cur = 0;
  for (const b of busy) {
    if (b.s - cur >= MIN_GAP) items.push({ kind: "free", start: cur, dur: b.s - cur });
    cur = Math.max(cur, b.e);
  }
  if (DAY_LEN - cur >= MIN_GAP) items.push({ kind: "free", start: cur, dur: DAY_LEN - cur });
  items.push({ kind: "now", start: NOW_MIN - 0.5 });
  return items.sort((x, y) => x.start - y.start);
}

const views = [{ k: "day", l: "برنامه امروز" }, { k: "smart", l: "پیشنهاد هوشمند" }, { k: "wait", l: "لیست انتظار" }] as const;

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
          <div className="flex flex-wrap gap-2"><Button variant="soft">تأیید</Button><Button variant="ghost">جابه‌جایی</Button><Button variant="ghost" className="!text-danger">لغو</Button></div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink3"><Bell size={12} />یادآوری خودکار ۲۴ ساعت و ۲ ساعت قبل</p>
        </div>
      )}
    </li>
  );
}

export default function CalendarPage() {
  const [who, setWho] = useState("all");
  const [view, setView] = useState<(typeof views)[number]["k"]>("day");
  const [open, setOpen] = useState<string | null>("a3");
  const cols = staff.filter((s) => who === "all" || s.id === who);
  const total = appts.filter((a) => who === "all" || a.staffId === who).length;

  return (
    <>
      <PageTitle title="تقویم و نوبت‌دهی" actions={<><Button variant="ghost"><Repeat size={14} />تکرارشونده</Button><Button><Plus size={14} />نوبت جدید</Button></>} />

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center gap-1">
            <button aria-label="روز قبل" className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2"><ChevronRight size={16} /></button>
            <span className="px-2 text-sm font-extrabold">{TODAY}</span>
            <button aria-label="روز بعد" className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2"><ChevronLeft size={16} /></button>
          </div>
          <select aria-label="متخصص" value={who} onChange={(e) => setWho(e.target.value)} className="mr-auto cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold">
            <option value="all">همه‌ی متخصص‌ها</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1" role="tablist">
          {views.map((v) => (
            <button key={v.k} role="tab" aria-selected={view === v.k} onClick={() => setView(v.k)} className={clsx("cursor-pointer rounded-lg px-2 py-2 text-[13px] font-bold", view === v.k ? "bg-surface text-rosedeep shadow-sm" : "text-ink2")}>
              {v.l}{v.k === "smart" && ` (${fa(smartSuggestions.length)})`}{v.k === "wait" && ` (${fa(waitlist.length)})`}
            </button>
          ))}
        </div>

        {view === "day" && (
          <div className="space-y-6">
            <p className="text-sm text-ink2"><b className="text-ink">{fa(total)}</b> نوبت امروز · ساعت <b className="text-ink">{clock(NOW_MIN)}</b> اکنون</p>
            {cols.map((s) => (
              <section key={s.id}>
                <header className="mb-2 flex items-center gap-2.5"><Avatar name={s.name} color={s.color} size={30} /><div className="leading-tight"><h2 className="text-sm font-extrabold">{s.name}</h2><p className="text-[11px] text-ink3">{s.role}</p></div></header>
                <ul className="space-y-2">
                  {timeline(s.id).map((it, i) => {
                    if (it.kind === "appt") return <ApptRow key={it.a.id} a={it.a} open={open === it.a.id} onToggle={() => setOpen(open === it.a.id ? null : it.a.id)} />;
                    if (it.kind === "now") return <li key={`n${i}`} className="flex items-center gap-2 text-[11px] font-bold text-danger" aria-label="اکنون"><span className="h-px flex-1 bg-danger/40" />اکنون {clock(NOW_MIN)}<span className="h-px flex-1 bg-danger/40" /></li>;
                    if (it.kind === "break") return <li key={`b${i}`} className="flex items-center gap-2 px-4 py-1.5 text-xs text-ink3"><Coffee size={13} />{it.label} · {range(it.start, it.dur)}</li>;
                    return (
                      <li key={`f${i}`}><button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed border-line px-4 py-2.5 text-xs text-ink2 hover:bg-rosesoft/50"><span>خالی · {range(it.start, it.dur)}</span><span className="inline-flex items-center gap-1 font-bold text-rose"><Plus size={13} />نوبت</span></button></li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

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

        {view === "wait" && (
          <Card>
            <ul className="divide-y divide-line">
              {waitlist.map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-5 py-4"><Hourglass size={16} className="shrink-0 text-amber" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{w.name}</p><p className="text-xs text-ink3">{w.want} · {w.window}</p></div><Button variant="soft">جای خالی؟</Button></li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
