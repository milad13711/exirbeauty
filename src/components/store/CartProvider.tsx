"use client";
import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { salons } from "@/lib/mock3";

type Ctx = {
  lines: Record<string, number>;
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
const KEY = "exir_ref";
const subscribe = () => () => {};
/** کد معرف از لینک (?ref=) خوانده و برای خریدهای بعدی همین مرورگر نگه داشته می‌شود */
function readRef(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("ref");
  try {
    if (fromUrl) { localStorage.setItem(KEY, fromUrl); return fromUrl; }
    return localStorage.getItem(KEY);
  } catch {
    return fromUrl;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Record<string, number>>({});
  const code = useSyncExternalStore(subscribe, readRef, () => null);

  const value = useMemo<Ctx>(() => ({
    lines,
    add: (id) => setLines((l) => ({ ...l, [id]: (l[id] ?? 0) + 1 })),
    dec: (id) => setLines((l) => { const n = { ...l, [id]: (l[id] ?? 0) - 1 }; if (n[id] <= 0) delete n[id]; return n; }),
    clear: () => setLines({}),
    count: Object.values(lines).reduce((a, b) => a + b, 0),
    refSalon: salons.find((s) => s.code === code) ?? null,
  }), [lines, code]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
