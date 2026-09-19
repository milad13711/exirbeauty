import type { ReactNode } from "react";

export type Col<T> = { h: string; cell: (r: T) => ReactNode; title?: boolean };

/** جدول در دسکتاپ، کارت در موبایل — بدون اسکرول افقی */
export function DataList<T>({ rows, cols, id }: { rows: T[]; cols: Col<T>[]; id: (r: T) => string }) {
  const title = cols.find((c) => c.title) ?? cols[0];
  const rest = cols.filter((c) => c !== title);
  return (
    <>
      <ul className="divide-y divide-line border-t border-line md:hidden">
        {rows.map((r) => (
          <li key={id(r)} className="space-y-1.5 px-5 py-3.5 text-sm">
            <div className="font-bold">{title.cell(r)}</div>
            {rest.map((c) => (
              <div key={c.h} className="flex items-center justify-between gap-3"><span className="text-xs text-ink3">{c.h}</span><span className="min-w-0 text-left">{c.cell(r)}</span></div>
            ))}
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-y border-line text-right text-xs text-ink3"><tr>{cols.map((c) => <th key={c.h} className="px-5 py-2.5 font-medium">{c.h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={id(r)} className="border-b border-line/60 last:border-0">{cols.map((c) => <td key={c.h} className="px-5 py-3">{c.cell(r)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
