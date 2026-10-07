"use client";
import { useState } from "react";
import { AlertTriangle, History, PackagePlus, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "./ui";
import { crm, type Product, type ProductKind } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, shortToman, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d.]/g, "")) || 0));
const MOVE: Record<string, string> = { RECEIVE: "ورود کالا", SALE: "فروش", SALE_VOID: "برگشت (ابطال فاکتور)", ADJUST: "اصلاح موجودی" };

type Draft = { id: string | null; name: string; kind: ProductKind; price: string; cost: string; stock: string; reorder: string; supplier: string };
const blank = (supplier = ""): Draft => ({ id: null, name: "", kind: "RETAIL", price: "0", cost: "0", stock: "0", reorder: "3", supplier });

function ProductForm({ d: init, onClose, onSaved }: { d: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(init);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    setErr("");
    if (d.name.trim().length < 2) return setErr("نام کالا را وارد کنید.");
    setBusy(true);
    try {
      const b = { name: d.name.trim(), kind: d.kind, price: num(d.price), cost: num(d.cost), reorder: num(d.reorder), supplier: d.supplier.trim() };
      if (d.id) await crm.updateProduct(d.id, b); else await crm.createProduct({ ...b, stock: num(d.stock) });
      onSaved(); onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  return (
    <Modal title={d.id ? "ویرایش کالا" : "کالای جدید"} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام"><input className={fieldCls} value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="نوع"><select className={fieldCls} value={d.kind} onChange={(e) => set({ kind: e.target.value as ProductKind })}><option value="RETAIL">محصول فروشی</option><option value="CONSUMABLE">ماده‌ی مصرفی</option></select></Field>
        <Field label="قیمت فروش (تومان)"><input dir="ltr" inputMode="numeric" disabled={d.kind === "CONSUMABLE"} className={fieldCls} value={d.price} onChange={(e) => set({ price: e.target.value })} /></Field>
        <Field label="قیمت خرید (تومان)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.cost} onChange={(e) => set({ cost: e.target.value })} /></Field>
        {!d.id && <Field label="موجودی اولیه"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.stock} onChange={(e) => set({ stock: e.target.value })} /></Field>}
        <Field label="نقطه‌ی سفارش"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.reorder} onChange={(e) => set({ reorder: e.target.value })} /></Field>
        <Field label="تأمین‌کننده"><input className={fieldCls} value={d.supplier} onChange={(e) => set({ supplier: e.target.value })} /></Field>
      </div>
      {d.id && <p className="mt-2 text-xs text-ink3">موجودی فقط با «ورود کالا»، «اصلاح موجودی» یا فروش تغییر می‌کند تا همه‌چیز در تاریخچه ثبت شود.</p>}
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
    </Modal>
  );
}

function StockModal({ p, mode, onClose, onSaved }: { p: Product; mode: "receive" | "adjust"; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(mode === "receive" ? String(Math.max(p.reorder * 2 - p.stock, 1)) : String(p.stock));
  const [cost, setCost] = useState(String(p.cost)); const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    setErr(""); setBusy(true);
    try {
      if (mode === "receive") await crm.receiveStock(p.id, { qty: num(qty), unitCost: num(cost) || undefined, note: note.trim() });
      else await crm.adjustStock(p.id, { stock: num(qty), note: note.trim() });
      onSaved(); onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`${mode === "receive" ? "ورود کالا" : "اصلاح موجودی"} — ${p.name}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label={mode === "receive" ? "تعداد ورودی" : "موجودی شمارش‌شده"}><input dir="ltr" inputMode="numeric" className={fieldCls} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        {mode === "receive" && <Field label="قیمت خرید واحد (تومان)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>}
        <Field label={mode === "receive" ? "توضیح (اختیاری)" : "دلیل اصلاح"}><input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {err && <ErrorNote message={err} />}
        <Button disabled={busy || (mode === "receive" ? num(qty) < 1 : note.trim().length < 2)} onClick={save}>ثبت</Button>
      </div>
    </Modal>
  );
}

function MovesModal({ p, onClose }: { p: Product; onClose: () => void }) {
  const q = useQuery(() => crm.stockMoves(p.id), [p.id]);
  return (
    <Modal title={`تاریخچه‌ی ${p.name}`} onClose={onClose}>
      {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <p className="text-sm text-ink3">حرکتی ثبت نشده است.</p> : (
        <ul className="divide-y divide-line text-sm">
          {q.data.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-ink2">{MOVE[m.kind]}{m.note ? ` — ${m.note}` : ""}<span className="mr-2 text-xs text-ink3">{faDate.short(m.createdAt.slice(0, 10))}</span></span>
              <span className="text-xs font-bold">{m.delta > 0 ? "+" : ""}{faNum(m.delta)} ← {faNum(m.stockAfter)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Board() {
  const me = useMe();
  const owner = canManage(me);
  const list = useQuery(() => crm.products(), []);
  const ov = useQuery(() => (owner ? crm.inventoryOverview() : Promise.resolve(null)), [owner]);
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [form, setForm] = useState<Draft | null>(null);
  const [stock, setStock] = useState<{ p: Product; mode: "receive" | "adjust" } | null>(null);
  const [hist, setHist] = useState<Product | null>(null);
  const [err, setErr] = useState("");
  const refresh = () => { void list.reload(); void ov.reload(); };
  if (list.loading && !list.data) return <Spinner />;
  if (!list.data) return <ErrorNote message={errorText(list.error)} onRetry={list.reload} />;
  const rows = list.data.filter((p) => filter === "all" || p.low);
  const lowNames = list.data.filter((p) => p.low).map((p) => p.name);
  async function remove(p: Product) {
    if (!confirm(`«${p.name}» از فهرست حذف شود؟ تاریخچه‌ی آن حفظ می‌ماند.`)) return;
    try { await crm.archiveProduct(p.id); refresh(); } catch (e) { setErr(errorText(e)); }
  }
  return (
    <div className="space-y-4">
      <PageTitle title="انبار و تأمین سالن" sub="موجودی محصولات فروشی و مواد مصرفی؛ با فروش فاکتور کم می‌شود" actions={owner ? <Button onClick={() => setForm(blank(list.data![0]?.supplier))}><Plus size={14} />کالای جدید</Button> : undefined} />
      {ov.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="اقلام" value={faNum(ov.data.items)} tone="rose" />
          <Stat label="زیر نقطه‌ی سفارش" value={faNum(ov.data.low)} tone="amber" icon={<AlertTriangle size={16} />} />
          <Stat label="ارزش موجودی" value={shortToman(ov.data.value)} tone="gold" />
          <Stat label="تأمین‌کننده‌ها" value={faNum(ov.data.suppliers)} tone="sky" />
        </div>
      )}
      {lowNames.length > 0 && <Card className="flex items-center gap-3 bg-ambersoft px-5 py-4"><AlertTriangle className="text-amber" /><p className="text-sm">{lowNames.slice(0, 5).join("، ")}{lowNames.length > 5 ? " و …" : ""} به نقطه‌ی سفارش رسیده{lowNames.length > 1 ? "‌اند" : " است"}.</p></Card>}
      {err && <ErrorNote message={err} />}
      <Card className="p-5">
        <CardHead title="موجودی" action={<div className="flex gap-2"><Chip active={filter === "all"} onClick={() => setFilter("all")}>همه</Chip><Chip active={filter === "low"} onClick={() => setFilter("low")}>نیازمند سفارش</Chip></div>} />
        {!rows.length ? <p className="text-sm text-ink3">{list.data.length ? "کالایی با این فیلتر نیست." : "هنوز کالایی ثبت نشده است."}</p> : (
          <ul className="divide-y divide-line">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                <span className="min-w-0 flex-1 basis-44 font-bold">{p.name}<span className="mr-2 text-xs font-normal text-ink3">{p.kind === "RETAIL" ? "فروشی" : "مصرفی"}{p.supplier ? ` · ${p.supplier}` : ""}</span></span>
                <b className={p.low ? "text-danger" : ""}>{faNum(p.stock)}</b>
                <span className="w-24 text-xs text-ink2">{p.kind === "RETAIL" ? `فروش ${shortToman(p.price)}` : "—"}</span>
                {p.low ? <Badge tone="danger">سفارش بده</Badge> : <Badge tone="sage">کافی</Badge>}
                <span className="flex items-center gap-1.5">
                  <Button variant="soft" onClick={() => setStock({ p, mode: "receive" })}><PackagePlus size={13} />ورود</Button>
                  <button aria-label={`تاریخچه ${p.name}`} onClick={() => setHist(p)} className="cursor-pointer rounded-lg p-2 text-ink3 hover:bg-surface2"><History size={14} /></button>
                  {owner && <>
                    <Button variant="ghost" onClick={() => setStock({ p, mode: "adjust" })}>اصلاح</Button>
                    <Button variant="ghost" onClick={() => setForm({ id: p.id, name: p.name, kind: p.kind, price: String(p.price), cost: String(p.cost), stock: String(p.stock), reorder: String(p.reorder), supplier: p.supplier })}>ویرایش</Button>
                    <button aria-label={`حذف ${p.name}`} onClick={() => remove(p)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={14} /></button>
                  </>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {ov.data && <p className="mt-3 text-xs text-ink3">ارزش موجودی: {toman(ov.data.value)}</p>}
      </Card>
      {form && <ProductForm d={form} onClose={() => setForm(null)} onSaved={refresh} />}
      {stock && <StockModal p={stock.p} mode={stock.mode} onClose={() => setStock(null)} onSaved={refresh} />}
      {hist && <MovesModal p={hist} onClose={() => setHist(null)} />}
    </div>
  );
}

export function LiveInventory() { return <LiveGate><Board /></LiveGate>; }
