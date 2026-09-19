"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Award, ExternalLink, Heart, Link2, Palmtree, Pencil, Plus, Star, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { actions, useDB, type StaffMember } from "@/lib/db";
import { dayInfo } from "@/lib/dates";
import { dayNames, hourToMin, minToHour, newStaff, uid } from "@/lib/factories";
import { fa, short } from "@/lib/fa";
import { clock } from "@/lib/booking";
import { isPhone } from "@/lib/validate";

const boards = [
  { t: "پرفروش‌ترین متخصص ماه", who: "مریم حسینی", icon: Trophy, tone: "gold" as const },
  { t: "بیشترین مشتری وفادار", who: "الهام رضایی", icon: Heart, tone: "rose" as const },
  { t: "بیشترین فروش محصول", who: "الهام رضایی", icon: TrendingUp, tone: "sage" as const },
  { t: "بالاترین رضایت مشتری", who: "مریم حسینی", icon: Star, tone: "amber" as const },
];
const halfHours = Array.from({ length: 21 }, (_, i) => i * 30); // ۹:۰۰ تا ۱۹:۰۰
const hourOpts = Array.from({ length: 11 }, (_, i) => 9 + i);
const dayOpts = Array.from({ length: 30 }, (_, i) => i);

export default function Staff() {
  const db = useDB();
  const [id, setId] = useState<string | null>(null);
  const [edit, setEdit] = useState<StaffMember | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState("");
  const [leave, setLeave] = useState({ from: 1, to: 1, reason: "" });

  const s = db.staff.find((x) => x.id === id) ?? db.staff[0];
  const isNew = edit && !db.staff.some((x) => x.id === edit.id);
  const set = <K extends keyof StaffMember>(k: K, v: StaffMember[K]) => setEdit(edit && { ...edit, [k]: v });

  const save = () => {
    if (!edit) return;
    if (edit.name.trim().length < 3) return setErr("نام متخصص را کامل وارد کنید.");
    if (edit.phone && !isPhone(edit.phone)) return setErr("شماره موبایل معتبر نیست.");
    if (edit.end <= edit.start) return setErr("ساعت پایان باید بعد از شروع باشد.");
    if (edit.breaks.some((b) => b.e <= b.s)) return setErr("پایان هر استراحت باید بعد از شروع آن باشد.");
    actions.saveStaff({ ...edit, name: edit.name.trim(), role: edit.role.trim() || "متخصص" });
    setId(edit.id); setEdit(null); setErr("");
  };
  const addLeave = () => {
    if (!edit) return;
    if (leave.to < leave.from) return setErr("پایان مرخصی نباید قبل از شروع باشد.");
    setErr(""); set("leaves", [...edit.leaves, { id: uid("l"), ...leave }]); setLeave({ from: 1, to: 1, reason: "" });
  };
  const leaveLabel = (a: number, b: number) => (a === b ? dayInfo(a).full : `${dayInfo(a).full} تا ${dayInfo(b).short}`);

  return (
    <>
      <PageTitle title="پرسنل و متخصص‌ها" sub="چه کسی چقدر برای سالن درآمد ساخته است؟" actions={<Button onClick={() => { setEdit(newStaff(db.staff.length)); setErr(""); }}><Plus size={14} />متخصص جدید</Button>} />

      {edit && (
        <Card className="mb-5">
          <CardHead title={isNew ? "متخصص جدید" : `ویرایش ${edit.name || "متخصص"}`} />
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5 px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="نام و نام خانوادگی"><input value={edit.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} /></Field>
              <Field label="تخصص"><input value={edit.role} onChange={(e) => set("role", e.target.value)} placeholder="مثلاً رنگ و مش" className={fieldCls} /></Field>
              <Field label="موبایل"><input value={edit.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
              <Field label="کمیسیون خدمات (٪)"><input type="number" min={0} max={80} value={edit.commissionPct} onChange={(e) => set("commissionPct", Math.min(80, +e.target.value || 0))} className={fieldCls} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="flex items-center gap-2 text-sm"><Toggle on={edit.active} onChange={(v) => set("active", v)} label="فعال بودن متخصص" />{edit.active ? "فعال (قابل رزرو)" : "غیرفعال"}</span>
              <span className="flex items-center gap-2 text-sm">ساعت کاری: از
                <select aria-label="شروع" value={minToHour(edit.start)} onChange={(e) => set("start", hourToMin(+e.target.value))} className={`${fieldCls} !w-auto !py-1.5`}>{hourOpts.slice(0, -1).map((h) => <option key={h} value={h}>{fa(h)}:۰۰</option>)}</select>
                تا <select aria-label="پایان" value={minToHour(edit.end)} onChange={(e) => set("end", hourToMin(+e.target.value))} className={`${fieldCls} !w-auto !py-1.5`}>{hourOpts.slice(1).map((h) => <option key={h} value={h}>{fa(h)}:۰۰</option>)}</select></span>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold text-ink2">روزهای تعطیل هفتگی این متخصص</legend>
              <div className="flex flex-wrap gap-2">{dayNames.map((d, i) => { const on = edit.daysOff.includes(i); return <label key={d} className={clsx("flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm", on ? "border-rose bg-rosesoft" : "border-line")}><input type="checkbox" checked={on} onChange={() => set("daysOff", on ? edit.daysOff.filter((x) => x !== i) : [...edit.daysOff, i])} className="size-4 accent-[#b4536f]" />{d}</label>; })}</div>
            </fieldset>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink2">زمان‌های استراحت (هر روز)</p>
              <ul className="space-y-2">
                {edit.breaks.map((b, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <input aria-label="عنوان استراحت" value={b.label} onChange={(e) => set("breaks", edit.breaks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={`${fieldCls} !w-36`} />
                    <select aria-label="شروع استراحت" value={b.s} onChange={(e) => set("breaks", edit.breaks.map((x, j) => (j === i ? { ...x, s: +e.target.value } : x)))} className={`${fieldCls} !w-auto`}>{halfHours.map((m) => <option key={m} value={m}>{clock(m)}</option>)}</select>
                    تا <select aria-label="پایان استراحت" value={b.e} onChange={(e) => set("breaks", edit.breaks.map((x, j) => (j === i ? { ...x, e: +e.target.value } : x)))} className={`${fieldCls} !w-auto`}>{halfHours.map((m) => <option key={m} value={m}>{clock(m)}</option>)}</select>
                    <button type="button" aria-label="حذف استراحت" onClick={() => set("breaks", edit.breaks.filter((_, j) => j !== i))} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="ghost" className="mt-2" onClick={() => set("breaks", [...edit.breaks, { s: 210, e: 240, label: "استراحت ناهار" }])}><Plus size={14} />افزودن استراحت</Button>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink2"><Palmtree size={14} />مرخصی</p>
              <ul className="mb-3 space-y-1.5">
                {edit.leaves.map((l) => <li key={l.id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1">{leaveLabel(l.from, l.to)}{l.reason && <span className="text-ink3"> · {l.reason}</span>}</span><button type="button" aria-label="حذف مرخصی" onClick={() => set("leaves", edit.leaves.filter((x) => x.id !== l.id))} className="cursor-pointer rounded-lg p-1.5 text-danger hover:bg-dangersoft"><Trash2 size={14} /></button></li>)}
                {!edit.leaves.length && <li className="text-xs text-ink3">مرخصی ثبت نشده است.</li>}
              </ul>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <select aria-label="از روز" value={leave.from} onChange={(e) => setLeave({ ...leave, from: +e.target.value, to: Math.max(leave.to, +e.target.value) })} className={fieldCls}>{dayOpts.map((d) => <option key={d} value={d}>{d === 0 ? "امروز" : dayInfo(d).weekday + " " + dayInfo(d).short}</option>)}</select>
                <select aria-label="تا روز" value={leave.to} onChange={(e) => setLeave({ ...leave, to: +e.target.value })} className={fieldCls}>{dayOpts.filter((d) => d >= leave.from).map((d) => <option key={d} value={d}>{d === 0 ? "امروز" : dayInfo(d).weekday + " " + dayInfo(d).short}</option>)}</select>
                <input aria-label="دلیل" value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} placeholder="دلیل (اختیاری)" className={fieldCls} />
                <Button type="button" variant="soft" onClick={addLeave}>ثبت مرخصی</Button>
              </div>
              <p className="mt-2 text-[11px] text-ink3">در روزهای مرخصی، متخصص در تقویم و فرم رزرو نمایش داده نمی‌شود.</p>
            </div>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
            <div className="flex gap-2"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => { setEdit(null); setErr(""); }}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {boards.map((b) => { const I = b.icon; return (
          <Card key={b.t} className="flex items-center gap-3 p-4"><Badge tone={b.tone} className="size-10 justify-center !rounded-xl !p-0"><I size={18} /></Badge><div><p className="text-[11px] text-ink3">{b.t}</p><p className="text-sm font-bold">{b.who}</p></div></Card>
        ); })}
      </div>

      {s ? (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {db.staff.map((p) => (
              <li key={p.id}>
                <button onClick={() => { setId(p.id); setConfirmDel(false); }} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-3 text-right", s.id === p.id ? "border-rose ring-1 ring-rose" : "border-line hover:bg-surface2", !p.active && "opacity-55")}>
                  <Avatar name={p.name} color={p.color} size={42} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.name}</p><p className="truncate text-[11px] text-ink3">{p.active ? p.role : "غیرفعال"}</p></div>
                  {p.rating > 0 && <span className="inline-flex items-center gap-0.5 text-xs font-bold text-gold"><Star size={12} fill="currentColor" />{fa(p.rating)}</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="min-w-0 space-y-5">
            <Card className="flex flex-wrap items-center gap-3 p-4">
              <Avatar name={s.name} color={s.color} size={48} />
              <div className="min-w-0 flex-1"><h2 className="font-extrabold">{s.name}</h2><p className="text-xs text-ink3">{s.role} · کمیسیون {fa(s.commissionPct)}٪ · <bdi dir="ltr">{s.phone || "—"}</bdi></p></div>
              <Button variant="ghost" onClick={() => { setEdit({ ...s, breaks: [...s.breaks], leaves: [...s.leaves], daysOff: [...s.daysOff] }); setErr(""); }}><Pencil size={14} />ویرایش</Button>
            </Card>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="درآمد ماه" value={short(s.revenue)} tone="rose" icon={<Award size={16} />} />
              <Stat label="کمیسیون" value={short(s.commission)} tone="gold" />
              <Stat label="فروش محصول" value={short(s.products)} tone="sage" />
              <Stat label="میانگین فاکتور" value={short(s.avgInvoice)} tone="sky" />
              <Stat label="تعداد مشتری" value={fa(s.clients)} />
              <Stat label="مشتری جدید" value={fa(Math.round((s.clients * (100 - s.returning)) / 100))} sub="این ماه" tone="sage" />
              <Stat label="نرخ بازگشت" value={`${fa(s.returning)}٪`} tone="rose" />
              <Stat label="رضایت مشتری" value={s.rating ? `${fa(s.rating)} از ۵` : "—"} tone="amber" />
            </div>
            <Card>
              <CardHead title="لینک رزرو آنلاین" hint="مشتری با این لینک‌ها مستقیم نوبت می‌گیرد" action={<Link2 size={16} className="text-ink3" />} />
              <ul className="divide-y divide-line">
                {[{ l: `رزرو از ${s.name}`, h: `/book?staff=${s.id}` }, { l: "رزرو از سالن (هر متخصص)", h: "/book" }].map((x) => (
                  <li key={x.h} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1 basis-40"><b className="block">{x.l}</b><bdi dir="ltr" className="text-xs text-ink3">exirbeauty.ir{x.h}</bdi></span>
                    <Link href={x.h} className="inline-flex items-center gap-1 text-[13px] font-semibold text-rose hover:text-rosedeep"><ExternalLink size={13} />باز کردن فرم</Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHead title="ساعات کاری، استراحت و مرخصی" hint={`هر روز از ${clock(s.start)} تا ${clock(s.end)}`} />
              <div className="px-5 pb-5">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px]">
                  {dayNames.map((d, i) => { const off = !db.salon.hours[i].open || s.daysOff.includes(i); return <div key={d} className={clsx("rounded-lg py-2", off ? "bg-surface2 text-ink3" : "bg-rosesoft text-rosedeep")}><b>{d.slice(0, 3)}</b><br />{off ? "تعطیل" : "فعال"}</div>; })}
                </div>
                {s.breaks.length > 0 && <p className="mt-3 text-xs text-ink2">استراحت: {s.breaks.map((b) => `${b.label} (${clock(b.s)}–${clock(b.e)})`).join("، ")}</p>}
                {s.leaves.length > 0 && <ul className="mt-2 space-y-1 text-xs text-ink2">{s.leaves.map((l) => <li key={l.id}>🌴 {leaveLabel(l.from, l.to)}{l.reason && ` · ${l.reason}`}</li>)}</ul>}
              </div>
            </Card>
            {confirmDel ? (
              <Card className="space-y-2 bg-dangersoft p-4 text-sm text-danger"><p>«{s.name}» از فهرست پرسنل و خدمات حذف می‌شود. نوبت‌های ثبت‌شده‌ی او باقی می‌مانند؛ بهتر است در صورت امکان فقط غیرفعالش کنید.</p><div className="flex gap-2"><Button className="!bg-danger" onClick={() => { actions.deleteStaff(s.id); setId(null); setConfirmDel(false); }}>حذف قطعی</Button><Button variant="ghost" onClick={() => setConfirmDel(false)}>انصراف</Button></div></Card>
            ) : <Button variant="ghost" className="!text-danger" onClick={() => setConfirmDel(true)}><Trash2 size={14} />حذف متخصص</Button>}
          </div>
        </div>
      ) : <p className="py-16 text-center text-sm text-ink3">هنوز متخصصی ثبت نشده است.</p>}
    </>
  );
}
