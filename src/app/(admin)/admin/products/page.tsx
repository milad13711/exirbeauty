"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm, type AdminStoreProduct } from "@/lib/crmApi";
import { CATEGORIES } from "@/lib/storeApi";
import { faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

type Draft = Omit<AdminStoreProduct, "id"> & { id: string | null };
const blank = (): Draft => ({ id: null, name: "", brand: "", category: CATEGORIES[0], price: 0, oldPrice: null, stock: 0, description: "", commissionPct: 10, active: true });

function Editor({ d: init, onClose, onSaved }: { d: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(init); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const n = (s: string) => Math.max(0, Math.round(Number(s) || 0));
  async function save() {
    setErr(""); setBusy(true);
    try { const { id, ...b } = d; if (id) await crm.adminStoreUpdate(id, b); else await crm.adminStoreCreate(b); onSaved(); onClose(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title={d.id ? "ویرایش محصول" : "محصول جدید"} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام"><input className={fieldCls} value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="برند"><input className={fieldCls} value={d.brand} onChange={(e) => set({ brand: e.target.value })} /></Field>
        <Field label="دسته"><select className={fieldCls} value={d.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="موجودی"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.stock} onChange={(e) => set({ stock: n(e.target.value) })} /></Field>
        <Field label="قیمت (تومان)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.price} onChange={(e) => set({ price: n(e.target.value) })} /></Field>
        <Field label="قیمت قبل از تخفیف (اختیاری)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.oldPrice ?? ""} onChange={(e) => set({ oldPrice: e.target.value ? n(e.target.value) : null })} /></Field>
        <Field label="پورسانت سالن معرف (٪)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.commissionPct} onChange={(e) => set({ commissionPct: Math.min(50, n(e.target.value)) })} /></Field>
        <div className="flex items-center gap-3 self-end"><Toggle on={d.active} onChange={(v) => set({ active: v })} label="نمایش در فروشگاه" /><span className="text-sm">{d.active ? "نمایش داده می‌شود" : "پنهان"}</span></div>
        <div className="sm:col-span-2"><Field label="توضیح"><textarea rows={3} className={fieldCls} value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
      </div>
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
    </Modal>
  );
}

function Board() {
  const q = useQuery(crm.adminStoreProducts, []);
  const [edit, setEdit] = useState<Draft | null>(null);
  return (
    <>
      <PageTitle title="محصولات فروشگاه" sub="کاتالوگ فروشگاه اکسیر؛ موجودی با هر سفارش کم و با لغو یا مرجوعی برمی‌گردد" actions={<Button onClick={() => setEdit(blank())}><Plus size={14} />محصول جدید</Button>} />
      <Card className="p-5">
        <CardHead title="محصولات" />
        {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <p className="text-sm text-ink3">محصولی ثبت نشده است.</p> : (
          <ul className="divide-y divide-line text-sm">
            {q.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 flex-1 basis-48"><b>{p.name}</b><span className="block text-xs text-ink3">{p.brand} · {p.category} · پورسانت {faNum(p.commissionPct)}٪</span></span>
                <b>{toman(p.price)}</b>
                <Badge tone={p.stock <= 0 ? "danger" : p.stock <= 5 ? "amber" : "sage"}>{faNum(p.stock)} عدد</Badge>
                {!p.active && <Badge>پنهان</Badge>}
                <Button variant="ghost" onClick={() => setEdit({ ...p })}>ویرایش</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {edit && <Editor d={edit} onClose={() => setEdit(null)} onSaved={() => void q.reload()} />}
    </>
  );
}

export default function AdminProducts() { return <AdminGate><Board /></AdminGate>; }
