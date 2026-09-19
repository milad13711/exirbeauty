"use client";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { catList, storeProducts, type SCat } from "@/lib/mock3";
import { fa, toman } from "@/lib/fa";

type P = (typeof storeProducts)[number] & { active: boolean };
const blank = (): P => ({ id: `n${Date.now()}`, name: "", brand: "", cat: "مو", price: 0, commission: 12, rating: 0, stock: 0, tint: ["#f7e4ea", "#f6ecd6"], desc: "", active: true });

export default function Products() {
  const [rows, setRows] = useState<P[]>(storeProducts.map((p) => ({ ...p, active: true })));
  const [edit, setEdit] = useState<P | null>(null);
  const isNew = edit && !rows.some((r) => r.id === edit.id);
  const save = () => {
    if (!edit || !edit.name.trim()) return;
    setRows(isNew ? [edit, ...rows] : rows.map((r) => (r.id === edit.id ? edit : r)));
    setEdit(null);
  };
  const set = <K extends keyof P>(k: K, v: P[K]) => setEdit(edit && { ...edit, [k]: v });

  return (
    <>
      <PageTitle title="مدیریت محصولات فروشگاه" sub={`${fa(rows.length)} محصول · درصد پورسانت هر محصول اینجا تعیین می‌شود`} actions={<Button onClick={() => setEdit(blank())}><Plus size={14} />محصول جدید</Button>} />

      {edit && (
        <Card className="mb-5">
          <CardHead title={isNew ? "محصول جدید" : "ویرایش محصول"} />
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="نام محصول"><input required value={edit.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} /></Field>
            <Field label="برند"><input value={edit.brand} onChange={(e) => set("brand", e.target.value)} className={fieldCls} /></Field>
            <Field label="دسته"><select value={edit.cat} onChange={(e) => set("cat", e.target.value as SCat)} className={fieldCls}>{catList.filter((c) => c !== "همه").map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="قیمت (تومان)"><input type="number" min={0} value={edit.price} onChange={(e) => set("price", +e.target.value || 0)} className={fieldCls} /></Field>
            <Field label="پورسانت سالن معرف (٪)"><input type="number" min={0} max={50} value={edit.commission} onChange={(e) => set("commission", Math.min(50, +e.target.value || 0))} className={fieldCls} /></Field>
            <Field label="موجودی"><input type="number" min={0} value={edit.stock} onChange={(e) => set("stock", +e.target.value || 0)} className={fieldCls} /></Field>
            <div className="sm:col-span-2"><Field label="توضیح کوتاه"><textarea rows={2} value={edit.desc} onChange={(e) => set("desc", e.target.value)} className={fieldCls} /></Field></div>
            <p className="text-xs text-ink2 sm:col-span-2">پورسانت هر فروش: <b>{toman(Math.round((edit.price * edit.commission) / 100))}</b></p>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => setEdit(null)}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <Card>
        <DataList rows={rows} id={(p) => p.id} cols={[
          { h: "محصول", title: true, cell: (p) => <>{p.name} <span className="text-xs font-normal text-ink3">· {p.brand}</span></> },
          { h: "دسته", cell: (p) => <Badge>{p.cat}</Badge> },
          { h: "قیمت", cell: (p) => <b>{toman(p.price)}</b> },
          { h: "پورسانت", cell: (p) => <Badge tone="gold">{fa(p.commission)}٪</Badge> },
          { h: "موجودی", cell: (p) => <span className={p.stock < 15 ? "font-bold text-danger" : ""}>{fa(p.stock)}</span> },
          { h: "فعال", cell: (p) => <Toggle on={p.active} label={`فعال بودن ${p.name}`} onChange={(v) => setRows(rows.map((r) => (r.id === p.id ? { ...r, active: v } : r)))} /> },
          { h: "", cell: (p) => <Button variant="ghost" onClick={() => setEdit(p)}><Pencil size={13} />ویرایش</Button> },
        ]} />
      </Card>
    </>
  );
}
