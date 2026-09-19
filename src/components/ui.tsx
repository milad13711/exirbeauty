import clsx from "clsx";
import type { ReactNode } from "react";
import { initials } from "@/lib/fa";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={clsx("min-w-0 rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(60,30,40,.04)]", className)}>
      {children}
    </section>
  );
}

export function CardHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div>
        <h3 className="text-[15px] font-bold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-ink3">{hint}</p>}
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
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Button({ variant = "primary", className, children, ...p }: { variant?: "primary" | "ghost" | "soft" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors",
        variant === "primary" && "bg-rose text-white hover:bg-rosedeep",
        variant === "soft" && "bg-rosesoft text-rosedeep hover:bg-[#f2d5de]",
        variant === "ghost" && "border border-line bg-surface text-ink2 hover:bg-surface2",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Avatar({ name, size = 36, color = "#b4536f" }: { name: string; size?: number; color?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Stat({ label, value, sub, tone = "neutral", icon }: { label: string; value: string; sub?: string; tone?: Tone; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-ink2">{label}</p>
        {icon && <span className={clsx("grid size-8 place-items-center rounded-lg", tones[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-[22px] font-extrabold leading-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink3">{sub}</p>}
    </Card>
  );
}

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink2">{sub}</p>}
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

export const tierTone: Record<string, Tone> = { VIP: "rose", "طلایی": "gold", "نقره‌ای": "neutral", "برنزی": "amber" };
