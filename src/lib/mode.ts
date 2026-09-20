"use client";
import { useSyncExternalStore } from "react";

/** حالت روشن/تیره؛ ترجیح هر دستگاه است (نه تننت) و در مرورگر نگه داشته می‌شود */
export type Mode = "light" | "dark" | "auto";
const KEY = "exir_mode";
const listeners = new Set<() => void>();
const read = (): Mode => { try { const v = localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; } };
export const setMode = (m: Mode) => { try { localStorage.setItem(KEY, m); } catch { /* بدون ذخیره هم کار می‌کند */ } listeners.forEach((l) => l()); };

const subMode = (cb: () => void) => {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => { listeners.delete(cb); mq.removeEventListener("change", cb); };
};
export const useMode = (): Mode => useSyncExternalStore(subMode, read, () => "auto");
export const useDark = (): boolean => {
  const m = useMode();
  const sys = useSyncExternalStore(subMode, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  return m === "dark" || (m === "auto" && sys);
};
// اسکریپت اولیه‌ی layout تا قبل از hydration هم تم درست باشد
export const modeBootScript = `try{var m=localStorage.getItem("${KEY}");var d=m==="dark"||(m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}`;
