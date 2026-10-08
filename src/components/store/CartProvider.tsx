"use client";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { store } from "@/lib/storeApi";
import { useQuery } from "@/lib/useQuery";

type Lines = Record<string, number>;
type Ctx = { lines: Lines; add: (id: string, max: number) => void; dec: (id: string) => void; clear: () => void; count: number; ref: string | null; refName: string | null };
const C = createContext<Ctx | null>(null);
export const useCart = () => { const c = useContext(C); if (!c) throw new Error("CartProvider missing"); return c; };

// The cart survives refreshes in the browser; the real stock check happens on the server when the order is placed.
const CART_KEY = "exir_cart";
const EMPTY: Lines = {};
let cart: Lines = EMPTY;
let cartLoaded = false;
const listeners = new Set<() => void>();
const getCart = () => {
  if (!cartLoaded && typeof window !== "undefined") { cartLoaded = true; try { const raw = localStorage.getItem(CART_KEY); if (raw) cart = JSON.parse(raw) as Lines; } catch {} }
  return cart;
};
const setCart = (next: Lines) => { cart = next; try { localStorage.setItem(CART_KEY, JSON.stringify(next)); } catch {} listeners.forEach((l) => l()); };
const subscribeCart = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

// The salon's code from the link (?ref=) is remembered by this browser for later purchases.
const REF_KEY = "exir_ref";
const subscribeNone = () => () => {};
function readRef(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("ref");
  try { if (fromUrl) { localStorage.setItem(REF_KEY, fromUrl); return fromUrl; } return localStorage.getItem(REF_KEY); } catch { return fromUrl; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribeCart, getCart, () => EMPTY);
  const ref = useSyncExternalStore(subscribeNone, readRef, () => null);
  const salon = useQuery(() => (ref ? store.referrer(ref).catch(() => null) : Promise.resolve(null)), [ref]);
  const value = useMemo<Ctx>(() => ({
    lines,
    add: (id, max) => { const cur = getCart(); if ((cur[id] ?? 0) < max) setCart({ ...cur, [id]: (cur[id] ?? 0) + 1 }); },
    dec: (id) => { const n = { ...getCart(), [id]: (getCart()[id] ?? 0) - 1 }; if (n[id] <= 0) delete n[id]; setCart(n); },
    clear: () => setCart(EMPTY),
    count: Object.values(lines).reduce((a, b) => a + b, 0),
    ref, refName: salon.data?.name ?? null,
  }), [lines, ref, salon.data]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
