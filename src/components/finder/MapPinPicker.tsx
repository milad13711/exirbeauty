"use client";
import { useRef } from "react";
import { MapPin } from "lucide-react";
import { IRAN_MAP_VIEWBOX, IRAN_PROVINCES, nearestCityByXY } from "@/lib/finder";

const VB_W = 582, VB_H = 528;

export function MapPinPicker({ x, y, onPick }: { x?: number; y?: number; onPick: (p: { x: number; y: number; city: string }) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function place(clientX: number, clientY: number) {
    const rect = ref.current!.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const vx = px * VB_W, vy = py * VB_H;
    onPick({ x: vx, y: vy, city: nearestCityByXY(vx, vy).name });
  }

  return (
    <div
      ref={ref}
      onClick={(e) => place(e.clientX, e.clientY)}
      className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border border-line bg-surface2 select-none"
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
      role="button"
      aria-label="انتخاب موقعیت روی نقشه"
    >
      <svg viewBox={IRAN_MAP_VIEWBOX} className="absolute inset-0 h-full w-full">
        {IRAN_PROVINCES.map((p) => (
          <path key={p.name} d={p.d} className="fill-surface stroke-line" strokeWidth={1} />
        ))}
      </svg>
      {x !== undefined && y !== undefined && (
        <div style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-full">
          <MapPin size={32} fill="#b5476b" className="text-rosedeep drop-shadow-lg" />
        </div>
      )}
      {x === undefined && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-ink3">روی نقشه لمس/کلیک کن تا لوکیشن دقیقت ثبت شود</p>
      )}
    </div>
  );
}
