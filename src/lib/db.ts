"use client";
// لایه‌ی داده‌ی مشترک نمونه (فقط برای پروتوتایپ): محصولات، انبار، فاکتور خرید، تراکنش موجودی.
// در فاز بک‌اند جای این ماژول را API می‌گیرد؛ امضای اکشن‌ها همان می‌ماند.
import { useSyncExternalStore } from "react";
import { storeProducts, type SCat } from "./mock3";
import { appts as seedAppts, type Appt } from "./mock";

export type DBProduct = {
  id: string; name: string; brand: string; cat: SCat; price: number; old?: number; commission: number; rating: number;
  stock: number; tint: string[]; desc: string; active: boolean;
  cost: number;        // آخرین قیمت خرید (تومان)
  reorder: number;     // نقطه سفارش
  reorderQty: number;  // تعداد پیشنهادی سفارش
};
export type InvLine = { productId: string; qty: number; unitCost: number };
export type PurchaseInvoice = { id: string; supplier: string; date: string; lines: InvLine[]; status: "در راه" | "دریافت‌شده"; };
export type Movement = { id: string; date: string; productId: string; delta: number; note: string };
export type DBAppt = Appt & { day: number };
export type DB = { products: DBProduct[]; invoices: PurchaseInvoice[]; moves: Movement[]; seq: number; appts: DBAppt[] };

export const suppliers = ["پخش رز", "آرین‌مد", "شرکت سیلک‌لب", "درماکو"];
export const TODAY_SHORT = "۲۸ شهریور";

const seedProducts: DBProduct[] = storeProducts.map((p) => ({
  ...p, active: true, cost: Math.round((p.price * 0.55) / 1000) * 1000, reorder: 15, reorderQty: 30,
}));
// دمو: یک کالای ناموجود و چند کالای زیر نقطه سفارش
const tweak: Record<string, Partial<DBProduct>> = { p5: { stock: 0, reorder: 12 }, p3: { stock: 8, reorder: 15 }, p3b: { stock: 6, reorder: 10, reorderQty: 20 }, p6: { stock: 15, reorder: 8 } };
export const seedDB: DB = {
  products: seedProducts.map((p) => ({ ...p, ...(tweak[p.id] ?? {}) })),
  invoices: [{ id: "خ-۱۰۰۱", supplier: "پخش رز", date: "۱۴ شهریور", lines: [{ productId: "p1", qty: 40, unitCost: 360_000 }, { productId: "p2", qty: 25, unitCost: 430_000 }], status: "دریافت‌شده" }],
  moves: [
    { id: "m1", date: "۱۴ شهریور", productId: "p1", delta: 40, note: "ورود · فاکتور خ-۱۰۰۱" },
    { id: "m2", date: "۱۴ شهریور", productId: "p2", delta: 25, note: "ورود · فاکتور خ-۱۰۰۱" },
    { id: "m3", date: "۲۰ شهریور", productId: "p1", delta: -3, note: "خروج · سفارش ۲۰۲۹" },
  ],
  seq: 1002,
  appts: seedAppts.map((a) => ({ ...a, day: 0 })),
};

const KEY = "exir_db_v2";
let state: DB = seedDB;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...seedDB, ...(JSON.parse(raw) as Partial<DB>) };
  } catch {}
}
export const getDB = () => { load(); return state; };
function commit(next: DB) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useDB = () => useSyncExternalStore(subscribe, getDB, () => seedDB);

export type StockState = "ناموجود" | "زیر نقطه سفارش" | "کافی";
export const stockState = (p: DBProduct): StockState => (p.stock <= 0 ? "ناموجود" : p.stock <= p.reorder ? "زیر نقطه سفارش" : "کافی");
export const invoiceTotal = (i: PurchaseInvoice) => i.lines.reduce((a, l) => a + l.qty * l.unitCost, 0);

export const actions = {
  saveProduct(p: DBProduct) {
    const d = getDB();
    const exists = d.products.some((x) => x.id === p.id);
    commit({ ...d, products: exists ? d.products.map((x) => (x.id === p.id ? p : x)) : [p, ...d.products] });
  },
  setReorder(id: string, reorder: number, reorderQty: number) {
    const d = getDB();
    commit({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, reorder, reorderQty } : p)) });
  },
  /** ثبت فاکتور خرید؛ اگر بار رسیده باشد موجودی همان لحظه خودکار شارژ می‌شود */
  createInvoice(supplier: string, lines: InvLine[], receiveNow: boolean) {
    const d = getDB();
    const inv: PurchaseInvoice = { id: `خ-${String(d.seq).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])}`, supplier, date: TODAY_SHORT, lines, status: "در راه" };
    commit({ ...d, invoices: [inv, ...d.invoices], seq: d.seq + 1 });
    if (receiveNow) actions.receiveInvoice(inv.id);
    return inv.id;
  },
  receiveInvoice(id: string) {
    const d = getDB();
    const inv = d.invoices.find((i) => i.id === id);
    if (!inv || inv.status === "دریافت‌شده") return;
    const add = new Map<string, InvLine[]>();
    inv.lines.forEach((l) => add.set(l.productId, [...(add.get(l.productId) ?? []), l]));
    commit({
      ...d,
      invoices: d.invoices.map((i) => (i.id === id ? { ...i, status: "دریافت‌شده" } : i)),
      products: d.products.map((p) => { const ls = add.get(p.id); return ls ? { ...p, stock: p.stock + ls.reduce((a, l) => a + l.qty, 0), cost: ls[ls.length - 1].unitCost } : p; }),
      moves: [...inv.lines.map((l, i) => ({ id: `${id}-${i}-${d.moves.length}`, date: TODAY_SHORT, productId: l.productId, delta: l.qty, note: `ورود · فاکتور ${id}` })), ...d.moves],
    });
  },
  /** فروش فروشگاه: کسر موجودی */
  sell(lines: Record<string, number>, orderNo: string) {
    const d = getDB();
    commit({
      ...d,
      products: d.products.map((p) => (lines[p.id] ? { ...p, stock: Math.max(0, p.stock - lines[p.id]) } : p)),
      moves: [...Object.entries(lines).map(([productId, q], i) => ({ id: `s-${orderNo}-${i}`, date: TODAY_SHORT, productId, delta: -q, note: `خروج · سفارش ${orderNo}` })), ...d.moves],
    });
  },
  addAppts(list: DBAppt[]) { const d = getDB(); commit({ ...d, appts: [...d.appts, ...list] }); },
  setApptStatus(id: string, status: Appt["status"]) { const d = getDB(); commit({ ...d, appts: d.appts.map((a) => (a.id === id ? { ...a, status } : a)) }); },
  cancelAppt(id: string) { const d = getDB(); commit({ ...d, appts: d.appts.filter((a) => a.id !== id) }); },
  reset() { commit(seedDB); },
};
