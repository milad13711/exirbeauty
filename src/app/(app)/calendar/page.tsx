"use client";
import { useState } from "react";
import clsx from "clsx";
import { Bell, CalendarClock, Check, ChevronLeft, ChevronRight, Clock, Hourglass, MoveHorizontal, Plus, Repeat, Sparkles, X } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, PageTitle, type Tone } from "@/components/ui";
import { appts, blocked, catColor, DAY_END, DAY_START, NOW_MIN, smartSuggestions, staff, TODAY, waitlist, type Appt } from "@/lib/mock";
import { fa, short } from "@/lib/fa";

const PX = 1.2; // پیکسل به‌ازای هر دقیقه
const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
const clock = (m: number) => `${fa(String(DAY_START + Math.floor(m / 60)).padStart(2, "0"))}:${fa(String(m % 60).padStart(2, "0"))}`;
const status: Record<Appt["status"], { l: string; t: Tone }> = {
  confirmed: { l: "تأیید‌شده", t: "sage" }, pending: { l: "در انتظار تأیید", t: "amber" },
  inservice: { l: "در حال انجام", t: "rose" }, done: { l: "انجام‌شده", t: "neutral" },
};

export default function CalendarPage() {
  const [sel, setSel] = useState<Appt | null>(appts[2]);
  const [who, setWho] = useState<string>("all");
  const cols = staff.filter((s) => who === "all" || s.id === who);
  const sm = sel && staff.find((s) => s.id === sel.staffId);

  return (
    <>
      <PageTitle title="تقویم و نوبت‌دهی" sub="تقویم سالن و هر متخصص · تداخل نوبت به‌طور خودکار جلوگیری می‌شود"
        actions={<><Button variant="ghost"><Repeat size={14} />نوبت تکرارشونده</Button><Button><Plus size={14} />نوبت جدید</Button></>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          {/* RTL: راست = قبلی، چپ = بعدی */}
          <button aria-label="روز قبل" className="cursor-pointer rounded-lg p-1.5 hover:bg-surface2"><ChevronRight size={16} /></button>
          <span className="px-2 text-sm font-bold">{TODAY}</span>
          <button aria-label="روز بعد" className="cursor-pointer rounded-lg p-1.5 hover:bg-surface2"><ChevronLeft size={16} /></button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto" role="tablist">
          <button role="tab" aria-selected={who === "all"} onClick={() => setWho("all")} className={clsx("cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold", who === "all" ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2")}>کل سالن</button>
          {staff.map((s) => (
            <button key={s.id} role="tab" aria-selected={who === s.id} onClick={() => setWho(s.id)} className={clsx("flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold", who === s.id ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2")}>
              <span className="size-2 rounded-full" style={{ background: s.color }} />{s.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="mr-auto hidden gap-1.5 md:flex">{Object.values(status).map((s) => <Badge key={s.l} tone={s.t}>{s.l}</Badge>)}</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="scroll-thin overflow-x-auto">
            <div style={{ minWidth: 120 + cols.length * 170 }}>
              {/* سربرگ ستون‌ها */}
              <div className="grid border-b border-line bg-surface2/50" style={{ gridTemplateColumns: `56px repeat(${cols.length}, 1fr)` }}>
                <div />
                {cols.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 border-r border-line px-3 py-2.5">
                    <Avatar name={s.name} color={s.color} size={28} />
                    <div className="min-w-0 leading-tight"><p className="truncate text-[13px] font-bold">{s.name}</p><p className="truncate text-[11px] text-ink3">{s.role}</p></div>
                  </div>
                ))}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${cols.length}, 1fr)`, height: hours.length * 60 * PX }}>
                <div>
                  {hours.map((h) => <div key={h} className="text-center text-[11px] text-ink3" style={{ height: 60 * PX }}><span className="relative -top-2">{fa(String(h).padStart(2, "0"))}:۰۰</span></div>)}
                </div>
                {cols.map((s) => (
                  <div key={s.id} className="relative border-r border-line">
                    {hours.map((h) => <button key={h} aria-label={`نوبت جدید ${s.name} ساعت ${h}`} className="group block w-full cursor-pointer border-b border-line/70 hover:bg-rosesoft/50" style={{ height: 60 * PX }}><Plus size={14} className="mx-auto hidden text-rose group-hover:block" /></button>)}
                    {(blocked[s.id] ?? []).map((b) => (
                      <div key={b.s} className="absolute inset-x-0 grid place-items-center text-[11px] font-semibold text-ink3" style={{ top: b.s * PX, height: (b.e - b.s) * PX, background: "repeating-linear-gradient(135deg,#f1e8e0,#f1e8e0 6px,#f8f1ea 6px,#f8f1ea 12px)" }}>{b.label}</div>
                    ))}
                    {appts.filter((a) => a.staffId === s.id).map((a) => {
                      const cc = catColor[a.cat];
                      const on = sel?.id === a.id;
                      return (
                        <button key={a.id} onClick={() => setSel(a)}
                          className={clsx("absolute inset-x-1 cursor-pointer overflow-hidden rounded-lg border-r-4 p-2 text-right transition-shadow", cc.bg, on ? "shadow-lg ring-2 ring-rose" : "hover:shadow-md", a.status === "done" && "opacity-60")}
                          style={{ top: a.start * PX + 1, height: a.dur * PX - 2, borderRightColor: cc.bar }}>
                          <p className={clsx("truncate text-[12px] font-bold", cc.fg)}>{a.client}</p>
                          <p className="truncate text-[11px] text-ink2">{a.service}</p>
                          {a.dur >= 75 && <p className="mt-0.5 text-[10px] text-ink3">{clock(a.start)}–{clock(a.start + a.dur)}</p>}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {/* خط اکنون */}
                <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: NOW_MIN * PX }}>
                  <span className="rounded-full bg-rose px-1.5 py-0.5 text-[10px] font-bold text-white">{clock(NOW_MIN)}</span>
                  <span className="h-px flex-1 bg-rose" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {sel && sm && (
            <Card>
              <CardHead title="جزئیات نوبت" action={<button aria-label="بستن" className="cursor-pointer rounded-lg p-1 hover:bg-surface2" onClick={() => setSel(null)}><X size={16} /></button>} />
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3"><Avatar name={sel.client} size={40} /><div><p className="font-bold">{sel.client}</p><p className="text-xs text-ink3">{sel.service} · {sm.name}</p></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone={status[sel.status].t}>{status[sel.status].l}</Badge><Badge><Clock size={11} />{clock(sel.start)}–{clock(sel.start + sel.dur)}</Badge></div>
                {sel.client === "سارا محمدی" && <p className="mt-3 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">⚠️ حساسیت به PPD — از رنگ‌های بدون PPD استفاده شود.</p>}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button variant="soft"><Check size={14} />تأیید</Button>
                  <Button variant="ghost"><MoveHorizontal size={14} />جابه‌جایی</Button>
                  <Button variant="ghost" className="!text-danger"><X size={14} />لغو</Button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink3"><Bell size={12} />یادآوری خودکار: ۲۴ ساعت و ۲ ساعت قبل از نوبت</p>
              </div>
            </Card>
          )}

          <Card>
            <CardHead title="نوبت بعدی را هوشمند پیشنهاد بده" hint="بر اساس چرخه‌ی مراجعه‌ی هر مشتری" action={<Sparkles size={17} className="text-rose" />} />
            <ul className="divide-y divide-line">
              {smartSuggestions.map((g) => (
                <li key={g.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between"><p className="text-sm font-bold">{g.name} <span className="font-medium text-rosedeep">· {g.reason}</span></p><span className="text-xs font-bold text-sage">{short(g.value)}</span></div>
                  <p className="mt-1 text-xs leading-6 text-ink2">{g.detail}</p>
                  <div className="mt-2 flex items-center justify-between"><Badge tone="sky"><CalendarClock size={11} />{g.slot} · {g.staff.split(" ")[0]}</Badge><button className="cursor-pointer text-[13px] font-semibold text-rose hover:text-rosedeep">ارسال پیشنهاد</button></div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHead title="لیست انتظار" action={<Hourglass size={16} className="text-amber" />} />
            <ul className="divide-y divide-line">
              {waitlist.map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-5 py-3"><div className="flex-1"><p className="text-sm font-semibold">{w.name}</p><p className="text-xs text-ink3">{w.want} · {w.window}</p></div><Button variant="soft">جای خالی؟</Button></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
