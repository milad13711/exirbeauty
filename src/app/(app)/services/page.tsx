"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { LiveGate, canManage, useMe } from "@/components/live/LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { crm, type Service, type ServiceInput, type Staff } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const CATS = ["مو", "پوست", "ناخن", "آرایش", "ابرو و مژه", "لیزر", "سایر"];

function ServiceForm({ initial, staff, onSave, onClose }: { initial: Service | null; staff: Staff[]; onSave: (b: ServiceInput & { category: string; name: string; price: number; durationMin: number }) => Promise<void>; onClose: () => void }) {
  const [category, setCategory] = useState(initial?.category ?? CATS[0]);
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [dur, setDur] = useState(String(initial?.durationMin ?? 60));
  const [commission, setCommission] = useState(String(initial?.commissionPct ?? 30));
  const [materials, setMaterials] = useState(initial?.materials ?? "");
  const [materialCost, setMaterialCost] = useState(String(initial?.materialCost ?? 0));
  const [discountNote, setDiscountNote] = useState(initial?.discountNote ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [ids, setIds] = useState<string[]>(initial?.staffIds ?? []);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d.]/g, "")) || 0));

  async function save() {
    if (name.trim().length < 2) return setErr("نام خدمت را وارد کنید.");
    if (num(dur) < 5) return setErr("مدت خدمت حداقل ۵ دقیقه است.");
    setBusy(true); setErr("");
    try { await onSave({ category, name: name.trim(), price: num(price), durationMin: num(dur), commissionPct: Math.min(100, num(commission)), materials: materials.trim(), materialCost: num(materialCost), discountNote: discountNote.trim(), active, staffIds: ids }); onClose(); }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title={initial ? "ویرایش خدمت" : "خدمت جدید"} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="دسته"><select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>{[...new Set([category, ...CATS])].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="نام خدمت"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          <Field label="قیمت (تومان)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          <Field label="مدت (دقیقه)"><input value={dur} onChange={(e) => setDur(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          <Field label="پورسانت متخصص (٪)"><input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          <Field label="هزینه‌ی مواد (تومان)"><input value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          <Field label="مواد مصرفی"><input value={materials} onChange={(e) => setMaterials(e.target.value)} className={fieldCls} /></Field>
          <Field label="تخفیف / پکیج"><input value={discountNote} onChange={(e) => setDiscountNote(e.target.value)} className={fieldCls} /></Field>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink2">متخصص‌هایی که این خدمت را انجام می‌دهند</p>
          {staff.length ? <div className="flex flex-wrap gap-1.5">{staff.map((s) => <Chip key={s.id} active={ids.includes(s.id)} onClick={() => setIds((l) => (l.includes(s.id) ? l.filter((x) => x !== s.id) : [...l, s.id]))}>{s.name}</Chip>)}</div> : <p className="text-xs text-ink3">ابتدا از بخش «پرسنل» متخصص اضافه کنید.</p>}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[#b5476b]" />قابل رزرو است</label>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره"}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

function Page() {
  const me = useMe();
  const services = useQuery(() => crm.services(), []);
  const staff = useQuery(() => crm.staff(), []);
  const [edit, setEdit] = useState<Service | "new" | null>(null);
  const [err, setErr] = useState("");
  const list = services.data ?? [];
  const cats = [...new Set(list.map((s) => s.category))];
  const staffName = (id: string) => staff.data?.find((s) => s.id === id)?.name;

  async function remove(s: Service) {
    if (!confirm(`خدمت «${s.name}» حذف شود؟ نوبت‌های قبلی دست‌نخورده می‌مانند.`)) return;
    try { await crm.archiveService(s.id); await services.reload(); } catch (e) { setErr(errorText(e)); }
  }

  return (
    <>
      <PageTitle title="خدمات" sub={`${faNum(list.length)} خدمت`} actions={canManage(me) ? <Button onClick={() => setEdit("new")}><Plus size={14} />خدمت جدید</Button> : undefined} />
      {(services.error || err) && <div className="mb-3"><ErrorNote message={err || errorText(services.error)} onRetry={services.reload} /></div>}
      {services.loading && !services.data ? <Spinner /> : (
        <div className="space-y-5">
          {cats.map((cat) => (
            <Card key={cat}>
              <CardHead title={cat} />
              <ul className="divide-y divide-line">
                {list.filter((s) => s.category === cat).map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span className="min-w-0 flex-1">
                      <b className="block text-sm">{s.name} {!s.active && <Badge tone="neutral">غیرفعال</Badge>}</b>
                      <span className="text-xs text-ink3">{faNum(s.durationMin)} دقیقه · {s.staffIds.length ? s.staffIds.map(staffName).filter(Boolean).join("، ") : "بدون متخصص (قابل رزرو نیست)"}</span>
                    </span>
                    <b className="text-sm">{toman(s.price)}</b>
                    {canManage(me) && <span className="flex gap-1"><button aria-label="ویرایش" onClick={() => setEdit(s)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink3 hover:bg-surface2"><Pencil size={15} /></button><button aria-label="حذف" onClick={() => remove(s)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink3 hover:bg-dangersoft hover:text-danger"><Trash2 size={15} /></button></span>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
          {!list.length && !services.loading && <p className="py-10 text-center text-sm text-ink3">هنوز خدمتی تعریف نشده است.</p>}
        </div>
      )}
      {edit && staff.data && (
        <ServiceForm initial={edit === "new" ? null : edit} staff={staff.data} onClose={() => setEdit(null)}
          onSave={async (b) => { if (edit === "new") await crm.createService(b); else await crm.updateService(edit.id, b); await services.reload(); }} />
      )}
    </>
  );
}

export default function Services() {
  return <LiveGate><Page /></LiveGate>;
}
