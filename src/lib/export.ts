export type Sheet = { name: string; head: string[]; rows: (string | number | null)[][]; widths?: number[] };

const clean = (n: string) => n.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

/** خروجی Excel (.xlsx) راست‌به‌چپ با سرستون پررنگ */
export async function exportXlsx(fileName: string, sheets: Sheet[]) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const data = sheets.map((sh) => ({
    sheet: clean(sh.name),
    rightToLeft: true,
    columns: sh.head.map((_, i) => ({ width: sh.widths?.[i] ?? 18 })),
    data: [
      sh.head.map((v) => ({ value: v, fontWeight: "bold" as const })),
      ...sh.rows.map((r) => r.map((v) => (v === "" || v === null ? null : { value: v }))),
    ],
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (writeExcelFile as any)(data).toFile(fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

/** CSV با BOM تا Excel فارسی را درست باز کند */
export function exportCsv(fileName: string, head: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => { const s = v === null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** تجزیه‌ی CSV/TSV (جداکننده‌ی خودکار، فیلد داخل گیومه، BOM) */
export function parseDelimited(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const first = t.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t", "،"].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); if (row.some((x) => x.trim())) rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  row.push(cur); if (row.some((x) => x.trim())) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    const rows = (await readSheet(file)) as unknown[][];
    return rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim())));
  }
  return parseDelimited(await file.text());
}
