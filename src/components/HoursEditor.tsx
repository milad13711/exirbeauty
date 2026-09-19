"use client";
import { Toggle, fieldCls } from "@/components/ui";
import type { DayHours } from "@/lib/db";
import { dayNames, hourToMin, minToHour } from "@/lib/factories";
import { fa } from "@/lib/fa";

const hourOpts = Array.from({ length: 11 }, (_, i) => 9 + i);

export function HoursEditor({ hours, onChange }: { hours: DayHours[]; onChange: (h: DayHours[]) => void }) {
  const setDay = (i: number, p: Partial<DayHours>) => onChange(hours.map((h, j) => (j === i ? { ...h, ...p } : h)));
  return (
    <ul className="space-y-2">
      {hours.map((h, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line px-4 py-2.5">
          <Toggle on={h.open} label={`باز بودن ${dayNames[i]}`} onChange={(v) => setDay(i, { open: v })} />
          <b className="w-20 text-sm">{dayNames[i]}</b>
          {h.open ? (
            <span className="flex items-center gap-2 text-sm">
              از <select aria-label={`شروع ${dayNames[i]}`} value={minToHour(h.start)} onChange={(e) => setDay(i, { start: hourToMin(+e.target.value) })} className={`${fieldCls} !w-auto !py-1.5`}>{hourOpts.slice(0, -1).map((x) => <option key={x} value={x}>{fa(x)}:۰۰</option>)}</select>
              تا <select aria-label={`پایان ${dayNames[i]}`} value={minToHour(h.end)} onChange={(e) => setDay(i, { end: hourToMin(+e.target.value) })} className={`${fieldCls} !w-auto !py-1.5`}>{hourOpts.slice(1).map((x) => <option key={x} value={x}>{fa(x)}:۰۰</option>)}</select>
            </span>
          ) : <span className="text-sm text-ink3">تعطیل</span>}
        </li>
      ))}
    </ul>
  );
}
