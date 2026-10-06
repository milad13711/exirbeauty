"use client";
import { useState } from "react";
import { fieldCls } from "@/components/ui";
import { fmtMin, parseTime } from "@/lib/fmt";
import type { Availability } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { Chip, ErrorNote, Spinner } from "./ui";

export type Slot = { staffId: string; startMin: number };

/** Free start times from the availability API, grouped by staff. `manual` adds a free-form time field (walk-ins). */
export function SlotPicker({ load, deps, value, onChange, manual }: { load: () => Promise<Availability>; deps: unknown[]; value: Slot | null; onChange: (s: Slot | null) => void; manual?: boolean }) {
  const q = useQuery(load, deps);
  const [time, setTime] = useState("");
  if (q.loading && !q.data) return <Spinner label="در حال بررسی ساعت‌های خالی…" />;
  if (q.error) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const groups = q.data?.staff ?? [];
  const any = groups.some((g) => g.starts.length);

  return (
    <div className="space-y-3">
      {!groups.length && <p className="text-sm text-ink3">متخصصی برای این خدمت تعریف نشده است.</p>}
      {groups.map((g) => (
        <div key={g.staffId}>
          <p className="mb-1.5 text-xs font-bold text-ink2">{g.name}</p>
          {g.starts.length ? (
            <div className="flex flex-wrap gap-1.5">{g.starts.map((s) => <Chip key={s} active={value?.staffId === g.staffId && value.startMin === s} onClick={() => onChange({ staffId: g.staffId, startMin: s })}>{fmtMin(s)}</Chip>)}</div>
          ) : <p className="text-xs text-ink3">در این روز وقت خالی ندارد.</p>}
        </div>
      ))}
      {groups.length > 0 && !any && <p className="text-sm text-ink3">برای این روز هیچ وقت خالی‌ای نیست؛ روز دیگری را امتحان کنید.</p>}
      {manual && groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs text-ink3">ساعت دلخواه (مراجعه‌ی حضوری):</span>
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); const m = parseTime(e.target.value); const sid = value?.staffId ?? groups[0].staffId; onChange(m === null ? null : { staffId: sid, startMin: m }); }} dir="ltr" className={`${fieldCls} !w-32`} />
          {time && value && <span className="text-xs text-ink2">{fmtMin(value.startMin)}{groups.length > 1 && " — برای متخصصِ انتخاب‌شده در لیست بالا"}</span>}
          {value && !groups.some((g) => g.staffId === value.staffId) && <span className="text-xs text-danger">متخصص نامعتبر</span>}
        </div>
      )}
      {value && <p className="text-xs text-ink2">انتخاب شما: <b>{groups.find((g) => g.staffId === value.staffId)?.name}</b> · ساعت <b>{fmtMin(value.startMin)}</b></p>}
    </div>
  );
}
