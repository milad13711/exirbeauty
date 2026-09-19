"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { actions, useDB, type Customer } from "@/lib/db";
import { newCustomer } from "@/lib/factories";
import { exportXlsx, parseDelimited, readSpreadsheet } from "@/lib/export";
import { digits } from "@/lib/validate";
import { fa } from "@/lib/fa";

type Field = "name" | "phone" | "gender" | "birth" | "favService" | "allergies" | "note" | "tags";
const FIELDS: { k: Field; l: string; syn: string[] }[] = [
  { k: "name", l: "نام و نام خانوادگی", syn: ["نام", "نام و نام خانوادگی", "name", "مشتری", "full name"] },
  { k: "phone", l: "موبایل", syn: ["موبایل", "شماره", "تلفن", "همراه", "phone", "mobile", "تماس"] },
  { k: "gender", l: "جنسیت", syn: ["جنسیت", "gender", "sex"] },
  { k: "birth", l: "تاریخ تولد", syn: ["تولد", "تاریخ تولد", "birth", "birthday"] },
  { k: "favService", l: "خدمت موردعلاقه", syn: ["خدمت", "خدمت موردعلاقه", "service"] },
  { k: "allergies", l: "حساسیت‌ها", syn: ["حساسیت", "حساسیت‌ها", "allergy", "allergies"] },
  { k: "note", l: "یادداشت", syn: ["یادداشت", "توضیحات", "note", "notes"] },
  { k: "tags", l: "برچسب‌ها", syn: ["برچسب", "برچسب‌ها", "tags", "tag"] },
];

/** ۰۹۱۲…، 9123456789، +98912… ← 09123456789 (لاتین) یا null */
function normPhone(raw: string): string | null {
  let d = digits(raw).replace(/[\s\-().]/g, "");
  if (d.startsWith("+98")) d = "0" + d.slice(3); else if (d.startsWith("0098")) d = "0" + d.slice(4); else if (d.startsWith("98") && d.length === 12) d = "0" + d.slice(2);
  if (/^9\d{9}$/.test(d)) d = "0" + d;
  return /^09\d{9}$/.test(d) ? d : null;
}

type Row = { n: number; cells: string[]; name: string; phone: string | null; raw: string; state: "ok" | "update" | "dup-file" | "bad-phone" | "no-name" | "exists"; existingId?: string };

export function CustomerImport() {
  const db = useDB();
  const [raw, setRaw] = useState<string[][] | null>(null);
  const [paste, setPaste] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [map, setMap] = useState<Record<Field, number>>({ name: -1, phone: -1, gender: -1, birth: -1, favService: -1, allergies: -1, note: -1, tags: -1 });
  const [onDup, setOnDup] = useState<"skip" | "update">("skip");
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; bad: Row[] } | null>(null);
  const [err, setErr] = useState("");
  const [fileName, setFileName] = useState("");

  const load = (rows: string[][], name = "") => {
    if (!rows.length) return setErr("فایل خالی است.");
    setErr(""); setRaw(rows); setResult(null); setFileName(name);
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const m = { ...map };
    let matched = 0;
    FIELDS.forEach((f) => { const i = head.findIndex((h) => f.syn.some((s) => h === s.toLowerCase() || h.includes(s.toLowerCase()))); m[f.k] = i; if (i >= 0) matched++; });
    setHasHeader(matched >= 1);
    if (matched === 0) { m.name = 0; m.phone = rows[0].length > 1 ? 1 : -1; }
    setMap(m);
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(xlsx|csv|txt|tsv)$/i.test(f.name)) return setErr("فقط فایل xlsx یا csv پشتیبانی می‌شود.");
    try { load(await readSpreadsheet(f), f.name); } catch { setErr("خواندن فایل ممکن نشد. اگر فایل قدیمی xls است، آن را به xlsx یا csv تبدیل کنید."); }
  };

  const body = useMemo(() => (raw ? (hasHeader ? raw.slice(1) : raw) : []), [raw, hasHeader]);
  const rows: Row[] = useMemo(() => {
    const seen = new Set<string>();
    const existing = new Map(db.customers.map((c) => [digits(c.phone).replace(/\s/g, ""), c.id]));
    return body.map((cells, i) => {
      const g = (k: Field) => (map[k] >= 0 ? cells[map[k]] ?? "" : "");
      const rawPhone = g("phone"); const phone = normPhone(rawPhone); const name = g("name").trim();
      let state: Row["state"] = "ok"; let existingId: string | undefined;
      if (name.length < 2) state = "no-name";
      else if (!phone) state = "bad-phone";
      else if (seen.has(phone)) state = "dup-file";
      else if (existing.has(phone)) { state = onDup === "update" ? "update" : "exists"; existingId = existing.get(phone); }
      if (phone) seen.add(phone);
      return { n: i + (hasHeader ? 2 : 1), cells, name, phone, raw: rawPhone, state, existingId };
    });
  }, [body, map, db.customers, onDup, hasHeader]);

  const count = (s: Row["state"]) => rows.filter((r) => r.state === s).length;
  const importable = rows.filter((r) => r.state === "ok" || r.state === "update");
  const g = (r: Row, k: Field) => (map[k] >= 0 ? r.cells[map[k]] ?? "" : "").trim();

  const run = () => {
    if (map.name < 0 || map.phone < 0) return setErr("ستون نام و موبایل را مشخص کنید.");
    let added = 0, updated = 0;
    for (const r of importable) {
      const phone = fa(r.phone!);
      const extra = { gender: /مرد|male|^m$/i.test(g(r, "gender")) ? "مرد" : "زن", birth: g(r, "birth"), favService: g(r, "favService"), note: g(r, "note"), allergies: g(r, "allergies").split(/[،,;\n]/).map((x) => x.trim()).filter(Boolean), tags: g(r, "tags").split(/[،,;]/).map((x) => x.trim()).filter(Boolean) };
      if (r.state === "update" && r.existingId) {
        const c = db.customers.find((x) => x.id === r.existingId)!;
        actions.saveCustomer({ ...c, name: r.name, gender: g(r, "gender") ? extra.gender : c.gender, birth: extra.birth || c.birth, favService: extra.favService || c.favService, note: extra.note || c.note, allergies: extra.allergies.length ? [...new Set([...c.allergies, ...extra.allergies])] : c.allergies, tags: [...new Set([...c.tags, ...extra.tags])] });
        updated++;
      } else {
        const c: Customer = { ...newCustomer(), name: r.name, phone, ...extra, tags: extra.tags.length ? extra.tags : ["ورود از فایل"] };
        actions.saveCustomer(c); added++;
      }
    }
    setResult({ added, updated, skipped: rows.length - importable.length, bad: rows.filter((r) => r.state !== "ok" && r.state !== "update") });
  };

  const downloadSample = () => exportXlsx("نمونه-ورود-مشتریان", [{ name: "مشتریان", head: ["نام و نام خانوادگی", "موبایل", "جنسیت", "تاریخ تولد", "خدمت موردعلاقه", "حساسیت‌ها", "یادداشت", "برچسب‌ها"], rows: [["نرگس رضایی", "09121234567", "زن", "۱۵ آذر ۱۳۷۹", "رنگ ریشه", "حساسیت به PPD", "عصرها نوبت می‌گیرد", "وفادار"], ["مریم احمدی", "09351112233", "زن", "", "کوتاهی", "", "", ""]] }]);
  const downloadBad = () => result && exportXlsx("ردیف‌های-ردشده", [{ name: "ردشده", head: ["ردیف", "نام", "موبایل", "دلیل"], rows: result.bad.map((r) => [r.n, r.name, r.raw, reasonText[r.state]]) }]);

  const reasonText: Record<Row["state"], string> = { ok: "", update: "به‌روزرسانی", "dup-file": "شماره تکراری در فایل", "bad-phone": "موبایل نامعتبر", "no-name": "نام خالی", exists: "قبلاً در CRM ثبت است" };
  const stateBadge = (s: Row["state"]) => s === "ok" ? <Badge tone="sage">جدید</Badge> : s === "update" ? <Badge tone="sky">به‌روزرسانی</Badge> : s === "exists" ? <Badge tone="amber">موجود</Badge> : <Badge tone="danger">{reasonText[s]}</Badge>;

  if (result) return (
    <>
      <PageTitle title="ورود مشتریان" />
      <Card className="mx-auto max-w-lg p-7 text-center">
        <FileSpreadsheet className="mx-auto text-sage" size={44} />
        <h2 className="mt-3 text-xl font-extrabold">ورود از فایل انجام شد</h2>
        <p className="mt-2 text-sm leading-7 text-ink2"><b className="text-sage">{fa(result.added)}</b> مشتری جدید · <b className="text-sky">{fa(result.updated)}</b> به‌روزرسانی · <b className="text-danger">{fa(result.skipped)}</b> ردشده</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/customers" className="inline-flex items-center rounded-xl bg-rose px-4 py-2.5 text-[13px] font-semibold text-white">مشاهده‌ی مشتریان</Link>{result.bad.length > 0 && <Button variant="ghost" onClick={downloadBad}><Download size={14} />دانلود ردیف‌های ردشده</Button>}<Button variant="ghost" onClick={() => { setResult(null); setRaw(null); setPaste(""); }}>ورود فایل دیگر</Button></div>
      </Card>
    </>
  );

  return (
    <>
      <PageTitle title="ورود مشتریان از فایل" sub="از Excel یا CSV؛ شماره‌ها به‌صورت خودکار استانداردسازی و تکراری‌ها شناسایی می‌شوند" actions={<Button variant="ghost" onClick={downloadSample}><Download size={14} />دانلود فایل نمونه</Button>} />

      {!raw ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHead title="۱. انتخاب فایل" hint="xlsx یا csv (ستون اول عنوان‌ها)" />
            <div className="px-5 pb-5">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center hover:bg-surface2"><Upload className="text-rose" /><b className="text-sm">انتخاب فایل از دستگاه</b><span className="text-xs text-ink3">حداکثر چند هزار ردیف</span><input type="file" accept=".xlsx,.csv,.txt,.tsv" className="sr-only" aria-label="انتخاب فایل" onChange={(e) => onFile(e.target.files?.[0])} /></label>
            </div>
          </Card>
          <Card>
            <CardHead title="یا کپی از Excel" hint="سلول‌ها را کپی و اینجا بچسبانید" />
            <div className="space-y-3 px-5 pb-5"><textarea aria-label="چسباندن داده" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={"نام\tموبایل\nنرگس رضایی\t09121234567"} className={`${fieldCls} font-mono text-xs`} dir="ltr" /><Button disabled={!paste.trim()} onClick={() => load(parseDelimited(paste), "کلیپ‌بورد")}>پردازش</Button></div>
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHead title="۲. تطبیق ستون‌ها" hint={`${fileName || "داده"} · ${fa(body.length)} ردیف`} action={<Button variant="ghost" onClick={() => { setRaw(null); setErr(""); }}>تغییر فایل</Button>} />
            <div className="space-y-3 px-5 pb-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="size-4 accent-[#b4536f]" />ردیف اول شامل عنوان ستون‌هاست</label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FIELDS.map((f) => (
                  <Field key={f.k} label={`${f.l}${f.k === "name" || f.k === "phone" ? " *" : ""}`}>
                    <select value={map[f.k]} onChange={(e) => setMap({ ...map, [f.k]: +e.target.value })} className={fieldCls}>
                      <option value={-1}>— نادیده گرفتن —</option>
                      {raw[0].map((h, i) => <option key={i} value={i}>{hasHeader ? h || `ستون ${fa(i + 1)}` : `ستون ${fa(i + 1)}: ${raw[0][i]}`}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm"><span className="text-ink2">اگر شماره در CRM موجود بود:</span>
                {([["skip", "رد شود"], ["update", "به‌روزرسانی شود"]] as const).map(([k, l]) => <label key={k} className={clsx("flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5", onDup === k ? "border-rose bg-rosesoft" : "border-line")}><input type="radio" name="dup" checked={onDup === k} onChange={() => setOnDup(k)} className="accent-[#b4536f]" />{l}</label>)}</div>
            </div>
          </Card>

          <Card>
            <CardHead title="۳. پیش‌نمایش و بررسی" hint={`${fa(count("ok"))} جدید · ${fa(count("update"))} به‌روزرسانی · ${fa(rows.length - importable.length)} ردشونده`} />
            <ul className="divide-y divide-line border-t border-line">
              {rows.slice(0, 40).map((r) => (
                <li key={r.n} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm"><span className="w-6 text-xs text-ink3">{fa(r.n)}</span><b className="min-w-0 flex-1 basis-32 truncate">{r.name || "—"}</b><bdi dir="ltr" className="text-xs text-ink2">{r.phone ?? r.raw ?? "—"}</bdi>{stateBadge(r.state)}</li>
              ))}
            </ul>
            {rows.length > 40 && <p className="px-5 py-3 text-xs text-ink3">و {fa(rows.length - 40)} ردیف دیگر (فقط ۴۰ ردیف اول نمایش داده می‌شود).</p>}
          </Card>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}
          <div className="flex flex-wrap gap-2"><Button disabled={!importable.length} onClick={run}><Upload size={14} />ورود {fa(importable.length)} مشتری</Button><Link href="/customers" className="inline-flex items-center rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2">انصراف</Link></div>
        </div>
      )}
      {!raw && err && <p role="alert" className="mt-4 rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}
    </>
  );
}
