"use client";
import clsx from "clsx";
import { Moon, Sun, SunMoon } from "lucide-react";
import { setMode, useMode, type Mode } from "@/lib/mode";

const opts: { k: Mode; l: string; I: typeof Sun }[] = [{ k: "light", l: "روشن", I: Sun }, { k: "dark", l: "تیره", I: Moon }, { k: "auto", l: "خودکار", I: SunMoon }];

/** انتخاب حالت روشن/تیره/خودکار (طبق تنظیم گوشی) */
export function ThemeToggle({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  const m = useMode();
  return (
    <div role="radiogroup" aria-label="حالت نمایش" className={clsx("inline-flex rounded-full border border-line bg-surface2 p-1", compact && "w-full")}>
      {opts.map(({ k, l, I }) => (
        <button key={k} title={l} aria-label={l} role="radio" aria-checked={m === k} onClick={() => setMode(k)} className={clsx("press flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold", m === k ? "bg-[image:var(--grad-rose)] text-white shadow-sm" : "text-ink2")}>
          <I size={14} />{!iconOnly && l}
        </button>
      ))}
    </div>
  );
}
