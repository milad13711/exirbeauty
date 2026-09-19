"use client";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { salons } from "@/lib/mock3";
import { getDB } from "@/lib/db";

type Lines = Record<string, number>;
type Ctx = {
  lines: Lines;
  add: (id: string) => void;
  dec: (id: string) => void;
  clear: () => void;
  count: number;
  refSalon: (typeof salons)[number] | null;
};
const C = createContext<Ctx | null>(null);
export const useCart = () => {
  const c = useContext(C);
  if (!c) throw new Error("CartProvider missing");
  return c;
};

// سبد در مرورگر پایدار می‌ماند تا با رفرش یا بازگشت مشتری از بین نرود
const CART_KEY = "exir_cart";
const EMPTY: Lines = {};
let cart: Lines = EMPTY;
let cartLoaded = false;
const listeners = new Set<() => void>();
const getCart = () => {
  if (!cartLoaded && typeof window !== "undefined") {
    cartLoaded = true;
    try { const raw = localStorage.getItem(CART_KEY); if (raw) cart = JSON.parse(raw) as Lines; } catch {}
  }
  return cart;
};
const setCart = (next: Lines) => {
  cart = next;
  try { localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
};
const subscribeCart = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

// کد معرف از لینک (?ref=) خوانده و برای خریدهای بعدی همین مرورگر نگه داشته می‌شود
const REF_KEY = "exir_ref";
const subscribeNone = () => () => {};
function readRef(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("ref");
  try {
    if (fromUrl) { localStorage.setItem(REF_KEY, fromUrl); return fromUrl; }
    return localStorage.getItem(REF_KEY);
  } catch {
    return fromUrl;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribeCart, getCart, () => EMPTY);
  const code = useSyncExternalStore(subscribeNone, readRef, () => null);

  const value = useMemo<Ctx>(() => ({
    lines,
    add: (id) => {
      const stock = getDB().products.find((p) => p.id === id)?.stock ?? 0;
      const cur = getCart();
      if ((cur[id] ?? 0) < stock) setCart({ ...cur, [id]: (cur[id] ?? 0) + 1 });
    },
    dec: (id) => { const n = { ...getCart(), [id]: (getCart()[id] ?? 0) - 1 }; if (n[id] <= 0) delete n[id]; setCart(n); },
    clear: () => setCart(EMPTY),
    count: Object.values(lines).reduce((a, b) => a + b, 0),
    refSalon: salons.find((s) => s.code === code) ?? null,
  }), [lines, code]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
