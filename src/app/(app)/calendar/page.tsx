"use client";
import { useState } from "react";
import clsx from "clsx";
import { Bell, CalendarClock, Check, ChevronLeft, ChevronRight, Hourglass, MoveHorizontal, Plus, Repeat, Sparkles, X } from "lucide-react";
import { Avatar, Badge, Button, Card, PageTitle } from "@/components/ui";
import { appts, blocked, DAY_END, DAY_START, NOW_MIN, smartSuggestions, staff, TODAY, waitlist, type Appt } from "@/lib/mock";
import { fa, short } from "@/lib/fa";

const PX = 1.3; // پیکسل به‌ازای هر دقیقه
const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
const clock = (m: number) => `${fa(String(DAY_START + Math.floor(m / 60)).padStart(2, "0"))}:${fa(String(m % 60).padStart(2, "0"))}`;

/** رنگ فقط یک معنا دارد: وضعیت نوبت */
const st: Record<Appt["status"], { label: string; card: string; dot: string }> = {
  inservice: { label: "در حال انجام", card: "border-rose bg-rosesoft", dot: "bg-rose" },
  confirmed: { label: "تأیید‌شده", card: "border-sage bg-sagesoft", dot: "bg-sage" },
  pending: { label: "منتظر تأیید", card: "border-amber border-dashed bg-ambersoft", dot: "bg-amber" },
  done: { label: "انجام‌شده", card: "border-line bg-surface2 opacity-70", dot: "bg-ink3" },
};

const tabs = [
  { k: "detail", l: "نوبت" },
  { k: "smart", l: "پیشنهاد هوشمند" },
  { k: "wait", l: "لیست انتظار" },
] as const;

export default function CalendarPage() {
  const [sel, setSel] = useState<Appt | null>(appts[2]);
  const [who, setWho] = useState("all");
  const [tab, setTab] = useState<(typeof tabs)[number]["k"]>("detail");
  const cols = staff.filter((s) => who === "all" || s.id === who);
  const list = appts.filter((a) => who === "all" || a.staffId === who);
  const free = 6;
  const pick = (a: Appt) => { setSel(a); setTab("detail"); };
  const sm = sel && staff.find((s) => s.id === sel.staffId);

  return (
    <>
      <PageTitle title="تقویم و نوبت‌دهی" actions={<><Button variant="ghost"><Repeat size={14} />تکرارشونده</Button><Button><Plus size={14} />نوبت جدید</Button></>} />

      {/* نوار ابزار: تاریخ ← متخصص ← خلاصه */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-1">
          <button aria-label="روز قبل" className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2"><ChevronRight size={16} /></button>
          <span className="min-w-[150px] text-center text-sm font-extrabold">{TODAY}</span>
          <button aria-label="روز بعد" className="cursor-pointer rounded-lg border border-line p-1.5 hover:bg-surface2"><ChevronLeft size={16} /></button>
          <button className="mr-1 cursor-pointer rounded-lg bg-rosesoft px-3 py-1.5 text-xs font-bold text-rosedeep">امروز</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink2">
          نمایش:
          <select value={who} onChange={(e) => setWho(e.target.value)} className="cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink">
            <option value="all">همه‌ی متخصص‌ها</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <p className="text-sm text-ink2"><b className="text-ink">{fa(list.length)}</b> نوبت · <b className="text-sage">{fa(free)}</b> جای خالی</p>
        <ul className="mr-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2" aria-label="راهنمای رنگ">
          {Object.values(st).map((s) => <li key={s.label} className="flex items-center gap-1.5"><span className={clsx("size-2.5 rounded-full", s.dot)} />{s.label}</li>)}
        </ul>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <Card className="overflow-hidden">
          <div className="scroll-thin overflow-x-auto">
            <div style={{ minWidth: 60 + cols.length * 180 }}>
              <div className="grid border-b border-line" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}>
                <div />
                {cols.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 border-r border-line px-3 py-2.5">
                    <Avatar name={s.name} color={s.color} size={30} />
                    <div className="min-w-0 leading-tight"><p className="truncate text-[13px] font-bold">{s.name}</p><p className="truncate text-[11px] text-ink3">{s.role}</p></div>
                  </div>
                ))}
              </div>

              <div className="relative grid" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)`, height: hours.length * 60 * PX }}>
                <div className="relative">
                  {hours.map((h, i) => (
                    <span key={h} className="absolute inset-x-0 text-center text-[11px] text-ink3" style={{ top: i * 60 * PX + 4 }}>{fa(String(h).padStart(2, "0"))}:۰۰</span>
                  ))}
                </div>

                {cols.map((s) => (
                  <div key={s.id} className="relative border-r border-line">
                    {hours.map((h) => (
                      <button key={h} aria-label={`نوبت جدید ${s.name} ساعت ${fa(h)}`} className="group relative block w-full cursor-pointer border-t border-line/80 hover:bg-rosesoft/40" style={{ height: 60 * PX }}>
                        <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dotted border-line/70" />
                        <Plus size={14} className="mx-auto hidden text-rose group-hover:block" />
                      </button>
                    ))}

                    {(blocked[s.id] ?? []).map((b) => (
                      <div key={b.s} className="pointer-events-none absolute inset-x-0 grid place-items-center text-[11px] font-semibold text-ink3" style={{ top: b.s * PX, height: (b.e - b.s) * PX, background: "repeating-linear-gradient(135deg,#f1e8e0,#f1e8e0 6px,#f8f1ea 6px,#f8f1ea 12px)" }}>{b.label}</div>
                    ))}

                    {appts.filter((a) => a.staffId === s.id).map((a) => {
                      const on = sel?.id === a.id;
                      return (
                        <button key={a.id} onClick={() => pick(a)} aria-pressed={on}
                          className={clsx("absolute inset-x-1.5 z-[1] cursor-pointer overflow-hidden rounded-lg border-r-4 px-2.5 py-1.5 text-right transition-shadow", st[a.status].card, on ? "shadow-lg ring-2 ring-plum" : "hover:shadow-md")}
                          style={{ top: a.start * PX + 1, height: a.dur * PX - 2 }}>
                          <p className="truncate text-[12px] font-bold text-ink">{a.client}</p>
                          {a.dur >= 45 && <p className="truncate text-[11px] text-ink2">{a.service}</p>}
                          {a.dur >= 75 && <p className="mt-0.5 text-[10px] text-ink3">{clock(a.start)} – {clock(a.start + a.dur)}</p>}
                        </button>
                      );
                    })}
                  </div>
                ))}

                <div className="pointer-events-none absolute inset-x-0 z-[2] flex items-center" style={{ top: NOW_MIN * PX }}>
                  <span className="w-[60px] text-center"><span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{clock(NOW_MIN)}</span></span>
                  <span className="h-px flex-1 bg-danger" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* یک پنل کناری با سه تب، به‌جای سه کارت زیر هم */}
        <Card className="h-fit xl:sticky xl:top-20">
          <div className="flex border-b border-line" role="tablist">
            {tabs.map((t) => (
              <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
                className={clsx("-mb-px flex-1 cursor-pointer border-b-2 px-2 py-3 text-[13px] font-bold", tab === t.k ? "border-rose text-rosedeep" : "border-transparent text-ink2 hover:text-ink")}>
                {t.l}{t.k === "smart" && <span className="mr-1 rounded-full bg-rose px-1.5 text-[10px] text-white">{fa(smartSuggestions.length)}</span>}
                {t.k === "wait" && <span className="mr-1 rounded-full bg-amber px-1.5 text-[10px] text-white">{fa(waitlist.length)}</span>}
              </button>
            ))}
          </div>

          {tab === "detail" && (sel && sm ? (
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3"><Avatar name={sel.client} size={42} /><div><p className="font-bold">{sel.client}</p><p className="text-xs text-ink3">{sel.service}</p></div></div>
                <button aria-label="بستن" onClick={() => setSel(null)} className="cursor-pointer rounded-lg p-1 hover:bg-surface2"><X size={16} /></button>
              </div>
              <dl className="mt-4 divide-y divide-line text-sm">
                {[["ساعت", `${clock(sel.start)} – ${clock(sel.start + sel.dur)}`], ["متخصص", sm.name], ["وضعیت", st[sel.status].label]].map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-ink3">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              </dl>
              {sel.client === "سارا محمدی" && <p className="mt-3 rounded-xl bg-dangersoft p-2.5 text-xs leading-6 text-danger">⚠️ حساسیت به PPD؛ از رنگ‌های بدون PPD استفاده شود.</p>}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button variant="soft"><Check size={14} />تأیید</Button>
                <Button variant="ghost"><MoveHorizontal size={14} />جابه‌جا</Button>
                <Button variant="ghost" className="!text-danger"><X size={14} />لغو</Button>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink3"><Bell size={12} />یادآوری خودکار ۲۴ ساعت و ۲ ساعت قبل</p>
            </div>
          ) : <p className="px-5 py-12 text-center text-sm text-ink3">برای دیدن جزئیات، روی یک نوبت در تقویم بزنید.</p>)}

          {tab === "smart" && (
            <ul className="divide-y divide-line">
              <li className="flex items-center gap-2 px-5 py-3 text-xs text-ink2"><Sparkles size={14} className="text-rose" />بر اساس چرخه‌ی مراجعه‌ی هر مشتری</li>
              {smartSuggestions.map((g) => (
                <li key={g.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between"><p className="text-sm font-bold">{g.name}</p><span className="text-xs font-bold text-sage">{short(g.value)}</span></div>
                  <p className="text-[13px] font-semibold text-rosedeep">{g.reason}</p>
                  <p className="mt-1 text-xs leading-6 text-ink2">{g.detail}</p>
                  <div className="mt-2 flex items-center justify-between"><Badge tone="sky"><CalendarClock size={11} />{g.slot}</Badge><button className="cursor-pointer text-[13px] font-semibold text-rose hover:text-rosedeep">ارسال پیشنهاد</button></div>
                </li>
              ))}
            </ul>
          )}

          {tab === "wait" && (
            <ul className="divide-y divide-line">
              {waitlist.map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3.5"><Hourglass size={16} className="text-amber" /><div className="flex-1"><p className="text-sm font-semibold">{w.name}</p><p className="text-xs text-ink3">{w.want} · {w.window}</p></div><Button variant="soft">جای خالی؟</Button></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
