"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { actions, getDB, useDB } from "@/lib/db";
import { DEMO_OTP, digits, isPhone } from "@/lib/validate";

export default function StaffLogin() {
  const router = useRouter();
  const db = useDB();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const find = () => getDB().staff.find((s) => s.active && digits(s.phone) === digits(phone).replace(/\s|-/g, ""));
  const submit = () => {
    if (!sent) {
      if (!isPhone(phone)) return setErr("شماره موبایل را درست وارد کنید.");
      if (!find()) return setErr("این شماره به‌عنوان پرسنل این سالن ثبت نشده است. از مدیر سالن بخواهید شماره‌تان را در بخش پرسنل ثبت کند.");
      setErr(""); return setSent(true);
    }
    if (digits(code) !== DEMO_OTP) return setErr("کد تأیید اشتباه است.");
    const s = find();
    if (!s) return;
    actions.loginStaff(s.id, s.name);
    router.push("/my");
  };
  return (
    <>
      <div className="mb-6 text-center"><BrandMark size={64} className="mx-auto" /><h1 className="mt-3 text-xl font-extrabold">{db.salon.name}</h1><p className="text-sm text-ink2">ورود پرسنل؛ نوبت‌ها و کیف پول شما</p></div>
      <Card className="p-5 shadow-[var(--shadow-pop)]">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <Field label="شماره موبایل ثبت‌شده"><input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={sent} inputMode="tel" dir="ltr" placeholder="09121001111" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          {sent && <Field label="کد تأیید ۵ رقمی"><input autoFocus value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" dir="ltr" maxLength={5} style={{ textAlign: "center", letterSpacing: "0.4em" }} className={fieldCls} /></Field>}
          {sent && <p className="text-xs text-ink3">نسخه‌ی نمایشی: کد <b>{DEMO_OTP}</b></p>}
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs leading-6 text-danger">{err}</p>}
          <Button type="submit" className="w-full !min-h-12">{sent ? "ورود" : "دریافت کد تأیید"}</Button>
          <p className="text-center text-[11px] text-ink3">نسخه‌ی نمایشی: شماره‌ی مریم حسینی ۰۹۱۲۱۰۰۱۱۱۱</p>
        </form>
      </Card>
    </>
  );
}
