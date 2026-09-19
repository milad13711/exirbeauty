"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { actions, useDB, type Customer } from "@/lib/db";
import { newCustomer } from "@/lib/factories";
import { digits, isPhone } from "@/lib/validate";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export function CustomerForm({ id }: { id?: string }) {
  const db = useDB();
  const router = useRouter();
  const existing = id ? db.customers.find((c) => c.id === id) : undefined;
  const [c, setC] = useState<Customer>(() => existing ?? newCustomer());
  const [allergies, setAllergies] = useState((existing?.allergies ?? []).join("\n"));
  const [occasions, setOccasions] = useState((existing?.occasions ?? []).join("\n"));
  const [tags, setTags] = useState((existing?.tags ?? ["جدید"]).join("، "));
  const [err, setErr] = useState("");
  const [del, setDel] = useState(false);
  if (id && !existing) return <p className="py-16 text-center text-ink2">مشتری پیدا نشد.</p>;

  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setC({ ...c, [k]: v });
  const dup = db.customers.find((x) => x.id !== c.id && digits(x.phone).replace(/\s/g, "") === digits(c.phone).replace(/\s/g, ""));

  const submit = () => {
    if (c.name.trim().length < 3) return setErr("نام و نام خانوادگی را وارد کنید.");
    if (!isPhone(c.phone)) return setErr("شماره موبایل معتبر نیست (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).");
    if (dup) return setErr(`این شماره قبلاً برای «${dup.name}» ثبت شده است.`);
    actions.saveCustomer({ ...c, name: c.name.trim(), allergies: lines(allergies), occasions: lines(occasions), tags: tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean) });
    router.push(`/customers/${c.id}`);
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHead title={existing ? "ویرایش مشخصات مشتری" : "مشتری جدید"} />
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی"><input value={c.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} autoComplete="off" /></Field>
        <Field label="شماره موبایل"><input value={c.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        <Field label="جنسیت"><select value={c.gender} onChange={(e) => set("gender", e.target.value)} className={fieldCls}><option>زن</option><option>مرد</option></select></Field>
        <Field label="تاریخ تولد"><input value={c.birth} onChange={(e) => set("birth", e.target.value)} placeholder="مثلاً ۱۵ آذر ۱۳۷۹" className={fieldCls} /></Field>
        <Field label="خدمت موردعلاقه"><select value={c.favService} onChange={(e) => set("favService", e.target.value)} className={fieldCls}><option value="">—</option>{db.services.map((s) => <option key={s.id}>{s.name}</option>)}</select></Field>
        <Field label="متخصص موردعلاقه"><select value={c.favStaff} onChange={(e) => set("favStaff", e.target.value)} className={fieldCls}><option value="">—</option>{db.staff.map((s) => <option key={s.id}>{s.name}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="حساسیت‌ها و نکات ایمنی (هر مورد در یک خط)"><textarea rows={3} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="مثلاً حساسیت به PPD" className={fieldCls} /></Field></div>
        <Field label="مناسبت‌ها (هر مورد در یک خط)"><textarea rows={2} value={occasions} onChange={(e) => setOccasions(e.target.value)} placeholder="سالگرد ازدواج: ۲۲ اردیبهشت" className={fieldCls} /></Field>
        <Field label="برچسب‌ها (با ویرگول)"><input value={tags} onChange={(e) => setTags(e.target.value)} className={fieldCls} /></Field>
        <div className="sm:col-span-2"><Field label="یادداشت متخصص"><textarea rows={2} value={c.note} onChange={(e) => set("note", e.target.value)} className={fieldCls} /></Field></div>
        {dup && <p className="rounded-xl bg-ambersoft p-2.5 text-xs text-amber sm:col-span-2">هشدار: این شماره برای «{dup.name}» هم ثبت شده است.</p>}
        {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">{existing ? "ذخیره تغییرات" : "ثبت مشتری"}</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>انصراف</Button>
          {existing && !del && <Button type="button" variant="ghost" className="mr-auto !text-danger" onClick={() => setDel(true)}><Trash2 size={14} />حذف مشتری</Button>}
        </div>
        {del && existing && (
          <div className="space-y-2 rounded-xl bg-dangersoft p-3 text-xs text-danger sm:col-span-2"><p>پرونده‌ی «{existing.name}» با همه‌ی سوابق و عکس‌ها حذف می‌شود. این کار قابل بازگشت نیست.</p><div className="flex gap-2"><Button type="button" className="!bg-danger" onClick={() => { actions.deleteCustomer(existing.id); router.push("/customers"); }}>حذف قطعی</Button><Button type="button" variant="ghost" onClick={() => setDel(false)}>انصراف</Button></div></div>
        )}
      </form>
    </Card>
  );
}
