"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faDate, faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

type Row = { key: number; productId: string; qty: string; cost: string };
let seq = 0;

function Board() {
  const products = useQuery(crm.adminStoreProducts, []);
  const list = useQuery(crm.adminPurchases, []);
  const [open, setOpen] = useState(false); const [supplier, setSupplier] = useState(""); const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([]); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const add = () => setRows((r) => [...r, { key: ++seq, productId: products.data?.[0]?.id ?? "", qty: "1", cost: "0" }]);
  const num = (s: string) => Math.max(0, Math.round(Number(s) || 0));
  async function save() {
    setErr(""); setBusy(true);
    try {
      await crm.adminReceive({ supplier: supplier.trim(), note: note.trim(), lines: rows.map((r) => ({ productId: r.productId, qty: num(r.qty), unitCost: num(r.cost) })) });
      setOpen(false); setRows([]); setSupplier(""); setNote(""); await Promise.all([list.reload(), products.reload()]);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  if (products.loading && !products.data) return <Spinner />;
  return (
    <>
      <PageTitle title="فاکتورهای خرید" sub="با ثبت دریافت بار، موجودی انبار همان لحظه شارژ می‌شود" actions={<Button onClick={() => { setOpen(true); if (!rows.length) add(); }}><Plus size={14} />فاکتور خرید جدید</Button>} />
      {open && (
        <Card className="mb-5 space-y-3 p-5">
          <CardHead title="دریافت بار" />
          <div className="grid gap-3 sm:grid-cols-2"><Field label="تأمین‌کننده"><input className={fieldCls} value={supplier} onChange={(e) => setSupplier(e.target.value)} /></Field><Field label="توضیح (اختیاری)"><input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[1fr_5rem_8rem_2rem] items-center gap-2">
              <select className={fieldCls} value={r.productId} onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, productId: e.target.value } : x)))}>{products.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <input dir="ltr" inputMode="numeric" aria-label="تعداد" className={fieldCls} value={r.qty} onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, qty: e.target.value } : x)))} />
              <input dir="ltr" inputMode="numeric" aria-label="قیمت خرید واحد" className={fieldCls} value={r.cost} onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, cost: e.target.value } : x)))} />
              <button aria-label="حذف ردیف" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button>
            </div>
          ))}
          {err && <ErrorNote message={err} />}
          <div className="flex gap-2"><Button variant="ghost" onClick={add}><Plus size={14} />ردیف</Button><Button disabled={busy || supplier.trim().length < 2 || !rows.length} onClick={save}>ثبت و شارژ انبار</Button><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button></div>
        </Card>
      )}
      <Card className="p-5">
        <CardHead title="فاکتورهای ثبت‌شده" />
        {list.loading && !list.data ? <Spinner /> : !list.data?.length ? <p className="text-sm text-ink3">هنوز فاکتوری ثبت نشده است.</p> : (
          <ul className="divide-y divide-line text-sm">{list.data.map((p) => <li key={p.id} className="py-3"><div className="flex items-center gap-2"><b className="flex-1">{p.supplier}</b><span className="text-xs text-ink3">{faDate.short(p.createdAt.slice(0, 10))}</span><b>{toman(p.total)}</b></div><p className="text-xs text-ink2">{p.lines.map((l) => `${l.name} ×${faNum(l.qty)}`).join("، ")}</p></li>)}</ul>
        )}
      </Card>
    </>
  );
}

export default function AdminPurchases() { return <AdminGate><Board /></AdminGate>; }
