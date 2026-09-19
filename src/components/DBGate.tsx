"use client";
import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
/**
 * داده‌ی نمونه در مرورگر ذخیره می‌شود؛ برای اینکه مقدار اولیه‌ی فرم‌ها (useState) از داده‌ی واقعی
 * خوانده شود نه seed، اپ را فقط پس از hydration رندر می‌کنیم. (در فاز بک‌اند، SSR با API جایگزین می‌شود.)
 */
export function DBGate({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? <>{children}</> : <div className="min-h-screen bg-bg" aria-busy="true" />;
}
