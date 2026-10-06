"use client";
import { useState } from "react";
import { CalendarOff, KeyRound, Pencil, Plus, Trash2, UserX } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, PageTitle, fieldCls } from "@/components/ui";
import { LiveGate, canManage, useMe } from "@/components/live/LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { crm, type Break, type Staff, type StaffFull, type StaffInput } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { DAY_NAMES, faDate, faNum, fmtMin, parseTime, timeValue } from "@/lib/fmt";
import { digits, isPhone } from "@/lib/validate";
import { useQuery } from "@/lib/useQuery";

const COLORS = ["#b5476b", "#b98d3f", "#4b8a70", "#4a7fb0", "#8a5fb0", "#c07a1c", "#3a8f9a"];

function StaffForm({ initial, onSave, onClose }: { initial: Staff | null; onSave: (b: StaffInput & { name: string }) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [commission, setCommission] = useState(String(initial?.commissionPct ?? 30));
  const [start, setStart] = useState(timeValue(initial?.startMin ?? 540));
  const [end, setEnd] = useState(timeValue(initial?.endMin ?? 1140));
  const [daysOff, setDaysOff] = useState<number[]>(initial?.daysOff ?? [6]);
  const [breaks, setBreaks] = useState<{ s: string; e: string; label: string }[]>((initial?.breaks ?? []).map((b) => ({ s: timeValue(b.s), e: timeValue(b.e), label: b.label })));
  const [listed, setListed] = useState(initial?.listed ?? true);
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  async function save() {
    const s = parseTime(start), e = parseTime(end);
    if (name.trim().length < 2) return setErr("نام را وارد کنید.");
    if (s === null || e === null || s >= e) return setErr("ساعت شروع باید قبل از پایان باشد (مثلاً ۰۹:۰۰ تا ۱۹:۰۰).");
    const br: Break[] = [];
    for (const b of breaks) { const bs = parseTime(b.s), be = parseTime(b.e); if (bs === null || be === null || bs >= be) return setErr("ساعت استراحت‌ها را درست وارد کنید."); br.push({ s: bs, e: be, label: b.label.trim() }); }
    setBusy(true); setErr("");
    try { await onSave({ name: name.trim(), title: title.trim(), color, commissionPct: Math.min(100, Math.max(0, Math.round(Number(commission) || 0))), startMin: s, endMin: e, daysOff, breaks: br, listed, bio: bio.trim() }); onClose(); }
    catch (x) { setErr(errorText(x)); } finally { setBusy(false); }
  }
  return (
    <Modal title={initial ? "ویرایش متخصص" : "متخصص جدید"} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="نام"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          <Field label="تخصص / عنوان"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="متخصص رنگ و مش" className={fieldCls} /></Field>
          <Field label="ساعت شروع کار"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} dir="ltr" className={fieldCls} /></Field>
          <Field label="ساعت پایان کار"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} dir="ltr" className={fieldCls} /></Field>
          <Field label="پورسانت (٪)"><input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          <Field label="رنگ در تقویم"><div className="flex gap-1.5 py-1.5">{COLORS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className="size-7 cursor-pointer rounded-full ring-offset-2" style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : "none" }} />)}</div></Field>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink2">روزهای تعطیل</p>
          <div className="flex flex-wrap gap-1.5">{DAY_NAMES.map((d, i) => <Chip key={d} active={daysOff.includes(i)} onClick={() => setDaysOff((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]))}>{d}</Chip>)}</div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink2">استراحت‌ها</p>
          <div className="space-y-2">
            {breaks.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input type="time" aria-label="شروع" value={b.s} onChange={(e) => setBreaks((l) => l.map((x, j) => (j === i ? { ...x, s: e.target.value } : x)))} dir="ltr" className={`${fieldCls} !w-32`} />
                <span className="text-ink3">تا</span>
                <input type="time" aria-label="پایان" value={b.e} onChange={(e) => setBreaks((l) => l.map((x, j) => (j === i ? { ...x, e: e.target.value } : x)))} dir="ltr" className={`${fieldCls} !w-32`} />
                <input aria-label="عنوان" value={b.label} onChange={(e) => setBreaks((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="ناهار" className={`${fieldCls} !w-32`} />
                <button type="button" aria-label="حذف استراحت" onClick={() => setBreaks((l) => l.filter((_, j) => j !== i))} className="grid size-8 cursor-pointer place-items-center rounded-lg text-danger hover:bg-dangersoft"><Trash2 size={14} /></button>
              </div>
            ))}
            {breaks.length < 6 && <Button variant="ghost" className="!min-h-9" onClick={() => setBreaks((l) => [...l, { s: "12:00", e: "13:00", label: "ناهار" }])}><Plus size={14} />افزودن استراحت</Button>}
          </div>
        </div>
        <Field label="درباره‌ی متخصص (نمایش در رزرو آنلاین)"><textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} className={fieldCls} /></Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} className="size-4 accent-[#b5476b]" />در رزرو آنلاین و اکسیریاب نمایش داده شود</label>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره"}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

function LeavesAndLogin({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const q = useQuery(() => crm.staffMember(id), [id]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [reason, setReason] = useState(""); const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const m: StaffFull | null = q.data;
  const run = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); await q.reload(); onChanged(); } catch (e) { setErr(errorText(e)); } };
  return (
    <Modal title={m ? `مرخصی و ورود — ${m.name}` : "…"} onClose={onClose} wide>
      {!m ? <Spinner /> : (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-bold">مرخصی‌ها</h3>
            {m.leaves.length === 0 ? <p className="text-xs text-ink3">مرخصی ثبت نشده.</p> : (
              <ul className="mb-3 divide-y divide-line rounded-xl border border-line">
                {m.leaves.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-3 py-2 text-sm"><span className="flex-1">{faDate.short(l.fromDate.slice(0, 10))}{l.fromDate !== l.toDate && ` تا ${faDate.short(l.toDate.slice(0, 10))}`}{l.reason && <span className="text-ink3"> · {l.reason}</span>}</span><button aria-label="حذف" onClick={() => run(() => crm.deleteLeave(id, l.id))} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button></li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <Field label="از"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${fieldCls} !w-40`} /></Field>
              <Field label="تا"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${fieldCls} !w-40`} /></Field>
              <Field label="دلیل"><input value={reason} onChange={(e) => setReason(e.target.value)} className={`${fieldCls} !w-40`} /></Field>
              <Button disabled={!from || !to} onClick={() => run(async () => { await crm.addLeave(id, { fromDate: from, toDate: to, reason }); setFrom(""); setTo(""); setReason(""); })}><Plus size={14} />ثبت مرخصی</Button>
            </div>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-bold">ورود به پنل با پیامک</h3>
            <p className="mb-2 text-xs text-ink3">{m.loginPhone ? <>شماره‌ی فعلی: <bdi dir="ltr">{m.loginPhone}</bdi></> : "هنوز حساب ورودی ندارد."}</p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={`${fieldCls} !w-48`} /></Field>
              <Button disabled={!isPhone(phone)} onClick={() => run(async () => { await crm.inviteStaff(id, digits(phone).replace(/[\s-]/g, "")); setPhone(""); })}><KeyRound size={14} />{m.loginPhone ? "تغییر شماره" : "ایجاد دسترسی"}</Button>
            </div>
          </section>
          {err && <ErrorNote message={err} />}
        </div>
      )}
    </Modal>
  );
}

function Page() {
  const me = useMe();
  const q = useQuery(() => crm.staff(true), []);
  const [edit, setEdit] = useState<Staff | "new" | null>(null);
  const [extra, setExtra] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const list = q.data ?? [];
  const owner = canManage(me);
  const act = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); await q.reload(); } catch (e) { setErr(errorText(e)); } };

  return (
    <>
      <PageTitle title="پرسنل و متخصص‌ها" sub={`${faNum(list.filter((s) => s.active).length)} متخصص فعال`} actions={owner ? <Button onClick={() => setEdit("new")}><Plus size={14} />متخصص جدید</Button> : undefined} />
      {(q.error || err) && <div className="mb-3"><ErrorNote message={err || errorText(q.error)} onRetry={q.reload} /></div>}
      {q.loading && !q.data ? <Spinner /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((s) => (
            <Card key={s.id} className={`p-5 ${s.active ? "" : "opacity-70"}`}>
              <div className="flex items-start gap-3">
                <Avatar name={s.name} color={s.color} size={48} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold">{s.name} {!s.active && <Badge tone="neutral">غیرفعال</Badge>}</h3>
                  <p className="text-xs text-ink3">{s.title || "—"}</p>
                  <p className="mt-1 text-xs text-ink2">{fmtMin(s.startMin)} تا {fmtMin(s.endMin)} · تعطیل: {s.daysOff.length ? s.daysOff.map((d) => DAY_NAMES[d]).join("، ") : "ندارد"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{s.listed && <Badge tone="sage">نمایش در رزرو آنلاین</Badge>}{s.loginPhone && <Badge tone="sky">دارای ورود</Badge>}<Badge tone="neutral">پورسانت {faNum(s.commissionPct)}٪</Badge></div>
                </div>
              </div>
              {owner && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Button variant="ghost" className="!min-h-9" onClick={() => setEdit(s)}><Pencil size={14} />ویرایش</Button>
                  <Button variant="ghost" className="!min-h-9" onClick={() => setExtra(s.id)}><CalendarOff size={14} />مرخصی و ورود</Button>
                  {s.active
                    ? <Button variant="ghost" className="!min-h-9 !text-danger" onClick={() => confirm(`«${s.name}» غیرفعال شود؟ نوبت‌های قبلی حفظ می‌شود.`) && act(() => crm.deactivateStaff(s.id))}><UserX size={14} />غیرفعال</Button>
                    : <Button variant="soft" className="!min-h-9" onClick={() => act(() => crm.updateStaff(s.id, { active: true }))}>فعال‌سازی دوباره</Button>}
                </div>
              )}
            </Card>
          ))}
          {!list.length && !q.loading && <p className="col-span-full py-10 text-center text-sm text-ink3">هنوز متخصصی ثبت نشده است.</p>}
        </div>
      )}
      {edit && <StaffForm initial={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSave={async (b) => { if (edit === "new") await crm.createStaff(b); else await crm.updateStaff(edit.id, b); await q.reload(); }} />}
      {extra && <LeavesAndLogin id={extra} onClose={() => setExtra(null)} onChanged={q.reload} />}
    </>
  );
}

export default function StaffPage() {
  return <LiveGate><Page /></LiveGate>;
}
