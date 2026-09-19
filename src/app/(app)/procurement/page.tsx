"use client";
import { useState } from "react";
import { AlertTriangle, PackagePlus, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { useDB } from "@/lib/db";
import { sales } from "@/lib/sales";
import type { StockItem } from "@/lib/seed-extra";
import { uid } from "@/lib/factories";
import { fa, short, toman } from "@/lib/fa";

export default function Procurement() {
  const db = useDB();
  const [recv, setRecv] = useState<{ id: string; qty: string; cost: string } | null>(null);
  const [edit, setEdit] = useState<StockItem | null>(null);
  const [err, setErr] = useState("");
  const low = db.inv.filter((x) => x.stock <= x.reorder);
  const value = db.inv.reduce((a, x) => a + x.stock * x.cost, 0);
  const sup = [...new Set(db.inv.map((x) => x.supplier))];

  return (
    <>
      <PageTitle title="انبار و تأمین سالن" sub="موجودی محصولات فروشی و مواد مصرفی؛ با فروش فاکتور کم می‌شود" actions={<Button onClick={() => setEdit({ id: uid("k"), name: "", kind: "consumable", price: 0, cost: 0, stock: 0, reorder: 3, supplier: sup[0] ?? "" })}><Plus size={14} />کالای جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اقلام" value={fa(db.inv.length)} tone="rose" />
        <Stat label="زیر نقطه سفارش" value={fa(low.length)} tone="amber" icon={<AlertTriangle size={16} />} />
        <Stat label="ارزش موجودی" value={short(value)} tone="gold" />
        <Stat label="تأمین‌کننده‌ها" value={fa(sup.length)} tone="sky" />
      </div>
      {low.length > 0 && <Card className="mt-5 flex items-center gap-3 bg-ambersoft px-5 py-4"><AlertTriangle className="text-amber" /><p className="text-sm">{low.map((x) => x.name).join("، ")} به نقطه‌ی سفارش رسیده {low.length > 1 ? "‌اند" : "است"}.</p></Card>}

      {edit && (
        <Card className="mt-5">
          <CardHead title={db.inv.some((x) => x.id === edit.id) ? "ویرایش کالا" : "کالای جدید"} />
          <form onSubmit={(e) => { e.preventDefault(); if (edit.name.trim().length < 2) return setErr("نام کالا را وارد کنید."); sales.saveStockItem({ ...edit, name: edit.name.trim() }); setEdit(null); setErr(""); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="نام"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={fieldCls} /></Field>
            <Field label="نوع"><select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as StockItem["kind"] })} className={fieldCls}><option value="retail">محصول فروشی</option><option value="consumable">ماده‌ی مصرفی</option></select></Field>
            <Field label="قیمت فروش"><input type="number" min={0} disabled={edit.kind === "consumable"} value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value || 0 })} className={fieldCls} /></Field>
            <Field label="قیمت خرید"><input type="number" min={0} value={edit.cost} onChange={(e) => setEdit({ ...edit, cost: +e.target.value || 0 })} className={fieldCls} /></Field>
            <Field label="موجودی"><input type="number" min={0} value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: +e.target.value || 0 })} className={fieldCls} /></Field>
            <Field label="نقطه سفارش"><input type="number" min={0} value={edit.reorder} onChange={(e) => setEdit({ ...edit, reorder: +e.target.value || 0 })} className={fieldCls} /></Field>
            <Field label="تأمین‌کننده"><input value={edit.supplier} onChange={(e) => setEdit({ ...edit, supplier: e.target.value })} className={fieldCls} /></Field>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2 lg:col-span-4">{err}</p>}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => { setEdit(null); setErr(""); }}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <Card className="mt-5">
        <CardHead title="موجودی" />
        <DataList rows={db.inv} id={(x) => x.id} cols={[
          { h: "کالا", title: true, cell: (x) => <>{x.name} <span className="text-xs font-normal text-ink3">· {x.kind === "retail" ? "فروشی" : "مصرفی"}</span></> },
          { h: "موجودی", cell: (x) => <b className={x.stock <= x.reorder ? "text-danger" : ""}>{fa(x.stock)}</b> },
          { h: "نقطه سفارش", cell: (x) => fa(x.reorder) },
          { h: "قیمت خرید", cell: (x) => short(x.cost) },
          { h: "قیمت فروش", cell: (x) => (x.kind === "retail" ? short(x.price) : "—") },
          { h: "تأمین‌کننده", cell: (x) => x.supplier },
          { h: "وضعیت", cell: (x) => (x.stock <= x.reorder ? <Badge tone="danger">سفارش بده</Badge> : <Badge tone="sage">کافی</Badge>) },
          { h: "", cell: (x) => recv?.id === x.id ? (
            <span className="flex flex-wrap items-center gap-1.5"><input aria-label="تعداد ورود" type="number" min={1} value={recv.qty} onChange={(e) => setRecv({ ...recv, qty: e.target.value })} className={`${fieldCls} !w-16 !py-1.5`} placeholder="تعداد" /><input aria-label="قیمت خرید" type="number" min={0} value={recv.cost} onChange={(e) => setRecv({ ...recv, cost: e.target.value })} className={`${fieldCls} !w-24 !py-1.5`} placeholder="قیمت" /><Button variant="soft" onClick={() => { if (+recv.qty > 0) { sales.receiveStock(x.id, +recv.qty, +recv.cost || 0); setRecv(null); } }}>ثبت ورود</Button></span>
          ) : <span className="flex gap-1.5"><Button variant="soft" onClick={() => setRecv({ id: x.id, qty: String(Math.max(x.reorder * 2 - x.stock, 1)), cost: String(x.cost) })}><PackagePlus size={13} />ورود</Button><Button variant="ghost" onClick={() => setEdit({ ...x })}>ویرایش</Button><button aria-label={`حذف ${x.name}`} onClick={() => sales.deleteStockItem(x.id)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={14} /></button></span> },
        ]} />
      </Card>
      <p className="mt-3 text-xs text-ink3">ارزش موجودی: {toman(value)}</p>
    </>
  );
}
