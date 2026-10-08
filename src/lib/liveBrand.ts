"use client";
import { useSyncExternalStore } from "react";

/** The signed-in salon's saved brand colour (from the API); null = nothing saved, the app uses its default palette. */
let color: string | null = null;
const listeners = new Set<() => void>();
export const setLiveBrand = (c: string | null) => { if (c !== color) { color = c; listeners.forEach((l) => l()); } };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useLiveBrand = () => useSyncExternalStore(subscribe, () => color, () => null);
