"use client";
import { api } from "./api";

export type StoreProduct = { id: string; name: string; brand: string; category: string; price: number; oldPrice: number | null; stock: number; description: string };
export type StoreOrderResult = { orderId: string; number: number; total: number; paymentId: string; paymentUrl: string };
export const CATEGORIES = ["مو", "پوست", "ناخن", "ست هدیه"] as const;
const TINT: Record<string, [string, string]> = { "مو": ["#f7e4ea", "#f6ecd6"], "پوست": ["#e0f0e8", "#f6ecd6"], "ناخن": ["#f7e4ea", "#e1edf8"], "ست هدیه": ["#f7e4ea", "#f6ecd6"] };
export const tintOf = (category: string) => TINT[category] ?? TINT["مو"];

const qs = (o: Record<string, string | undefined>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(o)) if (v) p.set(k, v); const s = p.toString(); return s ? `?${s}` : ""; };

export const store = {
  products: (q: { category?: string; q?: string } = {}) => api<StoreProduct[]>("GET", `/public/store/products${qs(q)}`),
  product: (id: string) => api<StoreProduct>("GET", `/public/store/products/${id}`),
  referrer: (slug: string) => api<{ name: string }>("GET", `/public/store/ref/${encodeURIComponent(slug)}`),
  order: (b: { items: { productId: string; qty: number }[]; customerName: string; phone: string; city: string; address: string; postalCode?: string; ref?: string }) => api<StoreOrderResult>("POST", "/public/store/orders", b),
};
