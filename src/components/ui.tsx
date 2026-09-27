import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...p} className={clsx("min-w-0 rounded-[22px] border border-line/80 bg-surface shadow-[var(--shadow-card)]", className)}>
      {children}
    </section>
  );
}

export function CardHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3.5">
      <div className="min-w-0">
        <h3 className="text-[15px] font-extrabold tracking-tight text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs leading-5 text-ink3">{hint}</p>}
      </div>
      {action}
    </header>
  );
}

const tones = {
  rose: "bg-rosesoft text-rosedeep",
  gold: "bg-goldsoft text-gold",
  sage: "bg-sagesoft text-sage",
  amber: "bg-ambersoft text-amber",
  danger: "bg-dangersoft text-danger",
  sky: "bg-skysoft text-sky",
  neutral: "bg-surface2 text-ink2",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}

const btn = {
  base: "press inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] px-4 py-2 text-[13.5px] font-bold disabled:cursor-not-allowed disabled:opacity-50",
  primary: "bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-8px_rgba(156,53,88,.6)] hover:brightness-110",
  soft: "bg-rosesoft text-rosedeep hover:brightness-95",
  ghost: "border border-line bg-surface text-ink2 hover:bg-surface2",
} as const;

export function Button({ variant = "primary", className, children, ...p }: { variant?: "primary" | "ghost" | "soft" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={clsx(btn.base, btn[variant], className)}>
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: "primary" | "ghost" | "soft"; className?: string; children: ReactNode }) {
  return <Link href={href} className={clsx(btn.base, btn[variant], className)}>{children}</Link>;
}

export { Avatar } from "./Avatar";

export function Stat({ label, value, sub, tone = "neutral", icon }: { label: string; value: string; sub?: string; tone?: Tone; icon?: ReactNode }) {
  return (
    <Card className="p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        {icon && <span className={clsx("grid size-8 shrink-0 place-items-center rounded-xl", tones[tone])}>{icon}</span>}
        <p className="min-w-0 truncate text-xs font-semibold text-ink2">{label}</p>
      </div>
      <p className="font-num mt-2 text-xl sm:text-[22px] font-extrabold leading-tight tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-[11.5px] leading-5 text-ink3">{sub}</p>}
    </Card>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-in mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink md:text-2xl">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-[13px] leading-6 text-ink2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const tierTone: Record<string, Tone> = { VIP: "rose", "طلایی": "gold", "نقره‌ای": "neutral", "برنزی": "amber" };

export const fieldCls = "min-h-11 w-full rounded-[14px] border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-shadow placeholder:text-ink3 focus:border-rose focus:shadow-[0_0_0_4px_rgba(181,71,107,.12)]";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-ink2">{label}</span>
      {children}
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={clsx("relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors", on ? "bg-[image:var(--grad-rose)]" : "bg-line")}>
      <span className={clsx("absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-all", on ? "right-0.5" : "right-[22px]")} />
    </button>
  );
}
