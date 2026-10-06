"use client";
import { useState } from "react";
import { Button, Field, fieldCls } from "@/components/ui";
import { digits, isPhone } from "@/lib/validate";
import type { CustomerInput, Gender } from "@/lib/crmApi";

const split = (s: string) => s.split(/[,،\n]/).map((x) => x.trim()).filter(Boolean);
const GENDERS: [Gender, string][] = [["FEMALE", "زن"], ["MALE", "مرد"], ["OTHER", "سایر"]];

type Initial = { name?: string; phone?: string; gender?: Gender; birthDate?: string | null; note?: string; tags?: string[]; allergies?: string[]; occasions?: string[]; source?: string };

export function CustomerForm({ initial = {}, submitLabel, onSubmit, onCancel }: { initial?: Initial; submitLabel: string; onSubmit: (b: CustomerInput & { name: string; phone: string }) => Promise<void>; onCancel?: () => void }) {
  const [name, setName] = useState(initial.name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [gender, setGender] = useState<Gender>(initial.gender ?? "FEMALE");
  const [birth, setBirth] = useState(initial.birthDate?.slice(0, 10) ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [tags, setTags] = useState((initial.tags ?? []).join("، "));
  const [allergies, setAllergies] = useState((initial.allergies ?? []).join("، "));
  const [occasions, setOccasions] = useState((initial.occasions ?? []).join("، "));
  const [source, setSource] = useState(initial.source ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("نام را وارد کنید.");
    if (!isPhone(phone)) return setErr("شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).");
    setErr(""); setBusy(true);
    try {
      await onSubmit({ name: name.trim(), phone: digits(phone).replace(/[\s-]/g, ""), gender, birthDate: birth || null, note: note.trim(), tags: split(tags), allergies: split(allergies), occasions: split(occasions), source: source.trim() });
    } catch (e) {
      const { errorText } = await import("@/lib/api");
      setErr(errorText(e));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} autoComplete="off" /></Field>
        <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        <Field label="جنسیت"><select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={fieldCls}>{GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="تاریخ تولد (میلادی)"><input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className={fieldCls} /></Field>
        <Field label="برچسب‌ها (با ویرگول جدا کنید)"><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="وفادار، VIP" className={fieldCls} /></Field>
        <Field label="نحوه‌ی آشنایی"><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="معرفی دوست، اینستاگرام…" className={fieldCls} /></Field>
        <Field label="حساسیت‌ها"><input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="PPD، پارافین" className={fieldCls} /></Field>
        <Field label="مناسبت‌ها"><input value={occasions} onChange={(e) => setOccasions(e.target.value)} placeholder="تولد: ۱۵ آذر" className={fieldCls} /></Field>
      </div>
      <Field label="یادداشت"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
      {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-sm text-danger">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : submitLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>انصراف</Button>}
      </div>
    </form>
  );
}
