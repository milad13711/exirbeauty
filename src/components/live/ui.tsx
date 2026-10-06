"use client";
import { useEffect, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";

export function Spinner({ label = "در حال بارگذاری…" }: { label?: string }) {
  return <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-ink3"><Loader2 size={16} className="animate-spin" />{label}</p>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-dangersoft p-3 text-sm text-danger">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry} className="cursor-pointer font-bold underline">تلاش دوباره</button>}
    </p>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className={`max-h-[90vh] w-full overflow-y-auto rounded-t-[22px] bg-surface p-5 shadow-[var(--shadow-pop)] sm:rounded-[22px] ${wide ? "max-w-xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="بستن" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink3 hover:bg-surface2"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${active ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line bg-surface text-ink2 hover:bg-surface2"}`}>{children}</button>;
}
