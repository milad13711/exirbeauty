"use client";
import { useState } from "react";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { actions, invoiceTotal, suppliers, useDB, type InvLine } from "@/lib/db";
import { fa, toman } from "@/lib/fa";

export default function Purchases() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState(suppliers[0]);
  const [lines, setLines] = useState<InvLine[]>([]);
  const name = (id: string) => db.products.find((p) => p.id === id)?.name ?? id;
  const total = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);

  const addLine = () => {
    const p = db.products[0];
    setLines([...lines, { productId: p.id, qty: 10, unitCost: p.cost }]);
  };
  const upd = (i: number, patch: Partial<InvLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const pickProduct = (i: number, id: string) => upd(i, { productId: id, unitCost: db.products.find((p) => p.id === id)!.cost });
  const submit = (receiveNow: boolean) => {
    if (!lines.length || lines.some((l) => l.qty <= 0)) return;
    actions.createInvoice(supplier, lines, receiveNow);
    setLines([]); setOpen(false);
  };

  return (
    <>
      <PageTitle title="فاکتورهای خرید" sub="با دریافت بار، موجودی انبار خودکار شارژ می‌شود" actions={<Button onClick={() => { setOpen(true); if (!lines.length) addLine(); }}><Plus size={14} />فاکتور خرید جدید</Button>} />

      {open && (
        <Card className="mb-5">
          <CardHead title="ثبت فاکتور خرید" />
          <div className="space-y-3 px-5 pb-5">
            <Field label="تأمین‌کننده"><select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={fieldCls}>{suppliers.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <ul className="space-y-2">
              {lines.map((l, i) => (
                <li key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_90px_140px_auto]">
                  <select aria-label="کالا" value={l.productId} onChange={(e) => pickProduct(i, e.target.value)} className={`${fieldCls} col-span-2 sm:col-span-1`}>{db.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <input aria-label="تعداد" type="number" min={1} value={l.qty} onChange={(e) => upd(i, { qty: +e.target.value || 0 })} className={fieldCls} placeholder="تعداد" />
                  <input aria-label="قیمت واحد" type="number" min={0} step={1000} value={l.unitCost} onChange={(e) => upd(i, { unitCost: +e.target.value || 0 })} className={fieldCls} placeholder="قیمت واحد" />
                  <button aria-label="حذف ردیف" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="cursor-pointer justify-self-end rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" onClick={addLine}><Plus size={14} />افزودن کالا</Button>
            <p className="text-sm">جمع فاکتور: <b>{toman(total)}</b></p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submit(true)}><PackageCheck size={14} />ثبت و دریافت بار (شارژ موجودی)</Button>
              <Button variant="ghost" onClick={() => submit(false)}>ثبت به‌عنوان «در راه»</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <DataList rows={db.invoices} id={(i) => i.id} cols={[
          { h: "فاکتور", title: true, cell: (i) => <>{i.id} <span className="text-xs font-normal text-ink3">· {i.date}</span></> },
          { h: "تأمین‌کننده", cell: (i) => i.supplier },
          { h: "اقلام", cell: (i) => <span className="text-ink2">{i.lines.map((l) => `${name(l.productId)} ×${fa(l.qty)}`).join("، ")}</span> },
          { h: "مبلغ", cell: (i) => <b>{toman(invoiceTotal(i))}</b> },
          { h: "وضعیت", cell: (i) => <Badge tone={i.status === "دریافت‌شده" ? "sage" : "amber"}>{i.status}</Badge> },
          { h: "", cell: (i) => (i.status === "در راه" ? <Button variant="soft" onClick={() => actions.receiveInvoice(i.id)}>دریافت بار</Button> : <span className="text-ink3">—</span>) },
        ]} />
      </Card>
    </>
  );
}
