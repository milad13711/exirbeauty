"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Globe, Plus, Settings2 } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Field, PageTitle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "@/components/live/LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { SlotPicker, type Slot } from "@/components/live/SlotPicker";
import { crm, type Appt, type ApptStatus, type CalSettings, type CustomerRow, type Service, type WaitEntry } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { DAY_NAMES, addDays, faDate, faNum, fmtMin, parseTime, timeValue, todayLocal } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const STATUS: Record<ApptStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "در انتظار تأیید", tone: "amber" },
  CONFIRMED: { label: "تأیید شده", tone: "sage" },
  IN_SERVICE: { label: "در حال انجام", tone: "sky" },
  DONE: { label: "انجام شد", tone: "neutral" },
  CANCELED: { label: "لغو شده", tone: "danger" },
  NO_SHOW: { label: "عدم حضور", tone: "danger" },
};

// ───────── new appointment ─────────
function NewAppt({ date, preCustomer, services, onClose, onDone }: { date: string; preCustomer: CustomerRow | null; services: Service[]; onClose: () => void; onDone: () => void }) {
  const [customer, setCustomer] = useState<CustomerRow | null>(preCustomer);
  const [q, setQ] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [day, setDay] = useState(date);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const found = useQuery(() => (q.trim().length >= 2 && !customer ? crm.customers({ q: q.trim(), limit: 6 }) : Promise.resolve(null)), [q, customer]);

  async function save() {
    if (!customer || !serviceId || !slot) return;
    setBusy(true); setErr("");
    try { await crm.createAppt({ customerId: customer.id, serviceId, staffId: slot.staffId, date: day, startMin: slot.startMin, note: note.trim() }); onDone(); onClose(); }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title="نوبت جدید" onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="مشتری">
          {customer ? (
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm"><span><b>{customer.name}</b> <bdi dir="ltr" className="text-xs text-ink3">{customer.phone}</bdi></span><button onClick={() => setCustomer(null)} className="cursor-pointer text-xs font-bold text-rose">تغییر</button></div>
          ) : (
            <div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره‌ی مشتری (حداقل ۲ حرف)…" className={fieldCls} autoFocus />
              {found.data && <ul className="mt-1.5 divide-y divide-line rounded-xl border border-line">{found.data.items.map((c) => <li key={c.id}><button onClick={() => setCustomer(c)} className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-right text-sm hover:bg-surface2"><b>{c.name}</b><bdi dir="ltr" className="text-xs text-ink3">{c.phone}</bdi></button></li>)}{!found.data.items.length && <li className="px-3 py-2 text-xs text-ink3">پیدا نشد؛ ابتدا از «مشتری جدید» ثبتش کنید.</li>}</ul>}
            </div>
          )}
        </Field>
        <Field label="خدمت">
          <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlot(null); }} className={fieldCls}>
            <option value="">انتخاب کنید…</option>
            {services.filter((s) => s.active && s.staffIds.length).map((s) => <option key={s.id} value={s.id}>{s.name} — {faNum(s.durationMin)} دقیقه</option>)}
          </select>
        </Field>
        <Field label="تاریخ"><input type="date" value={day} onChange={(e) => { setDay(e.target.value); setSlot(null); }} min={todayLocal()} className={`${fieldCls} !w-48`} /></Field>
        {serviceId && day && <div><p className="mb-1.5 text-xs font-bold text-ink2">ساعت — {faDate.full(day)}</p><SlotPicker manual load={() => crm.availability({ serviceId, date: day })} deps={[serviceId, day]} value={slot} onChange={setSlot} /></div>}
        <Field label="یادداشت (اختیاری)"><input value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy || !customer || !serviceId || !slot}>{busy ? "در حال ثبت…" : "ثبت نوبت"}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

// ───────── move / book-from-waitlist (same picker) ─────────
function PlaceModal({ title, serviceId, initialDate, confirmLabel, onSubmit, onClose }: { title: string; serviceId: string; initialDate: string; confirmLabel: string; onSubmit: (day: string, s: Slot) => Promise<void>; onClose: () => void }) {
  const [day, setDay] = useState(initialDate);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() { if (!slot) return; setBusy(true); setErr(""); try { await onSubmit(day, slot); onClose(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="تاریخ"><input type="date" value={day} onChange={(e) => { setDay(e.target.value); setSlot(null); }} min={todayLocal()} className={`${fieldCls} !w-48`} /></Field>
        <SlotPicker manual load={() => crm.availability({ serviceId, date: day })} deps={[serviceId, day]} value={slot} onChange={setSlot} />
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={go} disabled={busy || !slot}>{busy ? "…" : confirmLabel}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

// ───────── settings ─────────
function SettingsModal({ onClose }: { onClose: () => void }) {
  const q = useQuery(() => crm.calSettings(), []);
  const [s, setS] = useState<CalSettings | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const cur = s ?? q.data;
  if (!cur) return <Modal title="تنظیمات تقویم" onClose={onClose}><Spinner /></Modal>;
  const patch = (p: Partial<CalSettings>) => setS({ ...cur, ...p });
  async function save() {
    setBusy(true); setErr("");
    try { await crm.saveCalSettings(cur!); onClose(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title="تنظیمات تقویم و رزرو آنلاین" onClose={onClose} wide>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-bold text-ink2">ساعت کاری سالن</p>
          <div className="space-y-1.5">
            {cur.hours.map((h, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex w-28 cursor-pointer items-center gap-2"><input type="checkbox" checked={h.open} onChange={(e) => patch({ hours: cur.hours.map((x, j) => (j === i ? { ...x, open: e.target.checked } : x)) })} className="size-4 accent-[#b5476b]" />{DAY_NAMES[i]}</label>
                {h.open ? <>
                  <input type="time" aria-label="شروع" value={timeValue(h.start)} onChange={(e) => { const m = parseTime(e.target.value); if (m !== null) patch({ hours: cur.hours.map((x, j) => (j === i ? { ...x, start: m } : x)) }); }} dir="ltr" className={`${fieldCls} !w-32`} />
                  <span className="text-ink3">تا</span>
                  <input type="time" aria-label="پایان" value={timeValue(h.end)} onChange={(e) => { const m = parseTime(e.target.value); if (m !== null) patch({ hours: cur.hours.map((x, j) => (j === i ? { ...x, end: m } : x)) }); }} dir="ltr" className={`${fieldCls} !w-32`} />
                </> : <span className="text-xs text-ink3">تعطیل</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="فاصله‌ی ساعت‌ها"><select value={cur.stepMin} onChange={(e) => patch({ stepMin: Number(e.target.value) })} className={fieldCls}>{[10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{faNum(m)} دقیقه</option>)}</select></Field>
          <Field label="حداقل پیش‌اطلاع رزرو آنلاین (ساعت)"><input type="number" min={0} max={168} value={cur.leadHours} onChange={(e) => patch({ leadHours: Math.max(0, Math.min(168, Number(e.target.value) || 0)) })} dir="ltr" className={fieldCls} /></Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={cur.onlineEnabled} onChange={(e) => patch({ onlineEnabled: e.target.checked })} className="size-4 accent-[#b5476b]" />رزرو آنلاین فعال باشد</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={cur.autoConfirm} onChange={(e) => patch({ autoConfirm: e.target.checked })} className="size-4 accent-[#b5476b]" />نوبت‌های آنلاین بدون تأیید دستی ثبت شوند</label>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

// ───────── waitlist ─────────
function WaitModal({ services, onClose, onDone }: { services: Service[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [serviceId, setServiceId] = useState("");
  const [from, setFrom] = useState(todayLocal()); const [to, setTo] = useState(addDays(todayLocal(), 7)); const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); setErr(""); try { await crm.addWait({ name: name.trim(), phone: phone.replace(/\s/g, ""), serviceId, fromDate: from, toDate: to, note: note.trim() }); onDone(); onClose(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <Modal title="افزودن به لیست انتظار" onClose={onClose}>
      <div className="space-y-3">
        <Field label="نام"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
        <Field label="موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        <Field label="خدمت"><select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={fieldCls}><option value="">انتخاب کنید…</option>{services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="از"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldCls} /></Field><Field label="تا"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldCls} /></Field></div>
        <Field label="یادداشت"><input value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy || name.trim().length < 2 || !serviceId}>افزودن</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

// ───────── page ─────────
function CalendarPage() {
  const me = useMe();
  const sp = useSearchParams();
  const [date, setDate] = useState(todayLocal());
  const [tab, setTab] = useState<"day" | "wait">("day");
  const [staffId, setStaffId] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: "new" | "move" | "wait" | "waitBook" | "settings"; appt?: Appt; entry?: WaitEntry } | null>(null);
  const [err, setErr] = useState("");
  const [preCustomer, setPreCustomer] = useState<CustomerRow | null>(null);

  const staff = useQuery(() => crm.staff(), []);
  const services = useQuery(() => crm.services(), []);
  const appts = useQuery(() => crm.appointments({ date, staffId: staffId || undefined }), [date, staffId]);
  const wait = useQuery(() => crm.waitlist(), []);

  const preId = sp.get("customer");
  useEffect(() => {
    if (!preId) return;
    crm.customer(preId).then((c) => { setPreCustomer({ id: c.id, name: c.name, phone: c.phone, gender: c.gender, tags: c.tags, source: c.source, createdAt: c.createdAt, birthDate: c.birthDate }); setModal({ kind: "new" }); }).catch(() => {});
  }, [preId]);

  const isToday = date === todayLocal();
  const act = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); await appts.reload(); } catch (e) { setErr(errorText(e)); } };
  const rows = appts.data ?? [];
  const byStaff = (staff.data ?? []).filter((s) => !staffId || s.id === staffId).map((s) => ({ s, items: rows.filter((a) => a.staffId === s.id) }));
  const pending = rows.filter((a) => a.status === "PENDING").length;

  const actions = (a: Appt) => {
    const out: [string, () => void, "primary" | "ghost"][] = [];
    if (a.status === "PENDING") out.push(["تأیید", () => act(() => crm.confirmAppt(a.id)), "primary"]);
    if (a.status === "CONFIRMED") out.push(["شروع خدمت", () => act(() => crm.setApptStatus(a.id, "IN_SERVICE")), "primary"]);
    if (a.status === "CONFIRMED" || a.status === "IN_SERVICE") out.push(["انجام شد", () => act(() => crm.setApptStatus(a.id, "DONE")), "primary"]);
    if (a.status === "PENDING" || a.status === "CONFIRMED") out.push(["جابه‌جایی", () => setModal({ kind: "move", appt: a }), "ghost"]);
    if (a.status === "CONFIRMED") out.push(["عدم حضور", () => act(() => crm.setApptStatus(a.id, "NO_SHOW")), "ghost"]);
    if (a.status === "PENDING" || a.status === "CONFIRMED" || a.status === "IN_SERVICE") out.push([a.status === "PENDING" ? "رد کردن" : "لغو نوبت", () => { const r = prompt("دلیل (اختیاری):") ; if (r !== null) void act(() => crm.cancelAppt(a.id, r)); }, "ghost"]);
    return out;
  };

  return (
    <>
      <PageTitle title="تقویم و نوبت‌دهی" sub={pending ? `${faNum(pending)} نوبت منتظر تأیید شماست` : "نوبت‌های روز به تفکیک متخصص"}
        actions={<>{canManage(me) && <Button variant="ghost" onClick={() => setModal({ kind: "settings" })}><Settings2 size={14} />تنظیمات</Button>}<Button onClick={() => { setPreCustomer(null); setModal({ kind: "new" }); }}><Plus size={14} />نوبت جدید</Button></>} />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {([["day", "روز"], ["wait", `انتظار (${faNum(wait.data?.length ?? 0)})`]] as const).map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{l}</Chip>)}
      </div>

      {err && <div className="mb-3"><ErrorNote message={err} /></div>}

      {tab === "day" && (
        <>
          <Card className="mb-4 flex flex-wrap items-center gap-2 p-3">
            <button aria-label="روز قبل" onClick={() => setDate(addDays(date, -1))} className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line hover:bg-surface2"><ChevronRight size={16} /></button>
            <button aria-label="روز بعد" onClick={() => setDate(addDays(date, 1))} className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line hover:bg-surface2"><ChevronLeft size={16} /></button>
            <b className="mx-1 text-sm">{faDate.full(date)}</b>
            {!isToday && <button onClick={() => setDate(todayLocal())} className="cursor-pointer rounded-full bg-rosesoft px-3 py-1 text-xs font-bold text-rosedeep">امروز</button>}
            <input type="date" aria-label="انتخاب تاریخ" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="mr-auto rounded-xl border border-line bg-surface px-2 py-1.5 text-xs" />
            <select aria-label="متخصص" value={staffId} onChange={(e) => setStaffId(e.target.value)} className="rounded-xl border border-line bg-surface px-2 py-1.5 text-sm"><option value="">همه‌ی متخصص‌ها</option>{staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </Card>

          {appts.error && <ErrorNote message={errorText(appts.error)} onRetry={appts.reload} />}
          {(appts.loading && !appts.data) || (staff.loading && !staff.data) ? <Spinner /> : (
            <div className="space-y-4">
              {byStaff.map(({ s, items }) => (
                <Card key={s.id}>
                  <div className="flex items-center gap-2 px-5 pt-4 pb-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} /><b className="text-sm">{s.name}</b><span className="text-xs text-ink3">{s.title}</span><span className="mr-auto text-xs text-ink3">{faNum(items.filter((a) => a.status !== "CANCELED").length)} نوبت</span></div>
                  {items.length === 0 ? <p className="px-5 pb-4 text-xs text-ink3">نوبتی ثبت نشده.</p> : (
                    <ul className="divide-y divide-line">
                      {items.map((a) => (
                        <li key={a.id}>
                          <button onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-right hover:bg-surface2/50">
                            <span className="w-24 shrink-0 text-sm font-bold tabular-nums">{fmtMin(a.startMin)}–{fmtMin(a.startMin + a.durationMin)}</span>
                            <span className="min-w-0 flex-1"><b className={clsx("block truncate text-sm", (a.status === "CANCELED" || a.status === "NO_SHOW") && "line-through opacity-60")}>{a.customerName}</b><span className="text-xs text-ink3">{a.serviceName}</span></span>
                            {a.source === "ONLINE" && <span title="رزرو آنلاین" className="text-ink3"><Globe size={14} /></span>}
                            <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                          </button>
                          {open === a.id && (
                            <div className="space-y-2.5 bg-surface2/40 px-5 pb-4 pt-1 text-sm">
                              <p className="text-xs text-ink2"><bdi dir="ltr">{a.customerPhone}</bdi>{a.note && ` · ${a.note}`}{a.cancelReason && ` · دلیل لغو: ${a.cancelReason}`}</p>
                              <div className="flex flex-wrap gap-2">
                                {actions(a).map(([l, fn, v]) => <Button key={l} variant={v === "primary" ? "soft" : "ghost"} className={clsx("!min-h-9", l.includes("لغو") || l.includes("رد") ? "!text-danger" : "")} onClick={fn}>{l}</Button>)}
                                <a href={`/customers/${a.customerId}`} className="press inline-flex min-h-9 items-center rounded-[14px] border border-line px-3 text-[13px] font-bold text-ink2">پرونده</a>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
              {!byStaff.length && <p className="py-10 text-center text-sm text-ink3">هنوز متخصصی تعریف نشده؛ از بخش «پرسنل» شروع کنید.</p>}
            </div>
          )}
        </>
      )}

      {tab === "wait" && (
        <Card>
          <div className="flex items-center justify-between px-5 pt-4 pb-2"><b className="text-sm">لیست انتظار</b><Button variant="ghost" className="!min-h-9" onClick={() => setModal({ kind: "wait" })}><Plus size={14} />افزودن</Button></div>
          {wait.error && <div className="px-5 pb-3"><ErrorNote message={errorText(wait.error)} onRetry={wait.reload} /></div>}
          {(wait.data ?? []).length === 0 ? <p className="px-5 pb-5 text-sm text-ink3">کسی در لیست انتظار نیست.</p> : (
            <ul className="divide-y divide-line">
              {wait.data!.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1"><b>{w.name}</b> <bdi dir="ltr" className="text-xs text-ink3">{w.phone}</bdi><span className="block text-xs text-ink3">{services.data?.find((s) => s.id === w.serviceId)?.name} · {faDate.short(w.fromDate.slice(0, 10))} تا {faDate.short(w.toDate.slice(0, 10))}{w.note && ` · ${w.note}`}</span></span>
                  <Button variant="soft" className="!min-h-9" onClick={() => setModal({ kind: "waitBook", entry: w })}>رزرو</Button>
                  <Button variant="ghost" className="!min-h-9 !text-danger" onClick={async () => { try { await crm.cancelWait(w.id); await wait.reload(); } catch (e) { setErr(errorText(e)); } }}>حذف</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {modal?.kind === "new" && services.data && <NewAppt date={date} preCustomer={preCustomer} services={services.data} onClose={() => setModal(null)} onDone={() => { void appts.reload(); }} />}
      {modal?.kind === "move" && modal.appt?.serviceId && <PlaceModal title={`جابه‌جایی نوبت ${modal.appt.customerName}`} serviceId={modal.appt.serviceId} initialDate={modal.appt.date} confirmLabel="جابه‌جا کن" onClose={() => setModal(null)} onSubmit={async (d, s) => { await crm.moveAppt(modal.appt!.id, { date: d, startMin: s.startMin, staffId: s.staffId }); setDate(d); await appts.reload(); }} />}
      {modal?.kind === "waitBook" && modal.entry && <PlaceModal title={`رزرو برای ${modal.entry.name}`} serviceId={modal.entry.serviceId} initialDate={modal.entry.fromDate.slice(0, 10) < todayLocal() ? todayLocal() : modal.entry.fromDate.slice(0, 10)} confirmLabel="ثبت نوبت" onClose={() => setModal(null)} onSubmit={async (d, s) => { await crm.bookFromWait(modal.entry!.id, { staffId: s.staffId, date: d, startMin: s.startMin }); setDate(d); setTab("day"); await Promise.all([appts.reload(), wait.reload()]); }} />}
      {modal?.kind === "wait" && services.data && <WaitModal services={services.data} onClose={() => setModal(null)} onDone={() => { void wait.reload(); }} />}
      {modal?.kind === "settings" && <SettingsModal onClose={() => setModal(null)} />}
    </>
  );
}

export default function Calendar() {
  return <LiveGate><Suspense fallback={<Spinner />}><CalendarPage /></Suspense></LiveGate>;
}
