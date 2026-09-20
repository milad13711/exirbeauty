"use client";
import { Flower2 } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};
/**
 * داده‌ی نمونه در مرورگر ذخیره می‌شود؛ برای اینکه مقدار اولیه‌ی فرم‌ها (useState) از داده‌ی واقعی
 * خوانده شود نه seed، اپ را فقط پس از hydration رندر می‌کنیم. (در فاز بک‌اند، SSR با API جایگزین می‌شود.)
 */
export function DBGate({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? <>{children}</> : <div className="grid min-h-dvh place-items-center bg-bg" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-16 animate-[pulse-soft_1.6s_ease-in-out_infinite] place-items-center rounded-[22px] bg-[image:var(--grad-rose)] text-white shadow-[0_16px_34px_-12px_rgba(156,53,88,.65)]"><Flower2 size={30} /></span>
        <p className="text-[15px] font-extrabold text-ink">اکسیر بیوتی</p>
      </div>
    </div>;
}
