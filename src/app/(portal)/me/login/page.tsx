"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { ApiError, errorText } from "@/lib/api";
import { portal } from "@/lib/portalApi";
import { digits, isPhone } from "@/lib/validate";

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get("ref") ?? undefined;
  const [slug, setSlug] = useState(params.get("salon") ?? "");
  const [phone, setPhone] = useState(""); const [code, setCode] = useState(""); const [name, setName] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const clean = digits(phone).replace(/[\s-]/g, "");

  async function next() {
    setErr("");
    if (!slug.trim()) return setErr("نشانی سالن را وارد کنید (از لینکی که سالن برایتان فرستاده).");
    setBusy(true);
    try {
      if (step === "phone") {
        if (!isPhone(phone)) return setErr("شماره موبایل را درست وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).");
        await portal.requestCode(slug.trim(), clean); setStep("otp");
      } else {
        try {
          await portal.verify(slug.trim(), { phone: clean, code: digits(code), ...(step === "name" ? { name: name.trim() } : {}), ...(ref ? { ref } : {}) });
          router.push("/me");
        } catch (e) {
          if (e instanceof ApiError && e.code === "NAME_REQUIRED") setStep("name"); else throw e;
        }
      }
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="mb-6 text-center"><BrandMark size={64} className="mx-auto" /><h1 className="mt-3 text-xl font-extrabold">پنل مشتری</h1><p className="text-sm text-ink2">نوبت‌ها، امتیازها و کیف پول شما</p></div>
      <Card className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); void next(); }} className="space-y-4">
          {!params.get("salon") && step === "phone" && <Field label="نشانی سالن"><input value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" placeholder="مثلاً rose-salon" className={fieldCls} /></Field>}
          <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={step !== "phone"} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} autoComplete="tel" /></Field>
          {step !== "phone" && <Field label="کد تأیید ۶ رقمی"><input autoFocus value={code} onChange={(e) => setCode(e.target.value)} disabled={step === "name"} inputMode="numeric" dir="ltr" maxLength={6} style={{ textAlign: "center", letterSpacing: "0.4em" }} className={fieldCls} autoComplete="one-time-code" /></Field>}
          {step === "name" && <><p className="rounded-xl bg-rosesoft p-3 text-sm text-rosedeep">اولین بار است که وارد می‌شوید؛ لطفاً نام خود را بنویسید.</p><Field label="نام و نام خانوادگی"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} autoComplete="name" /></Field></>}
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full !py-3">{step === "phone" ? "دریافت کد تأیید" : step === "otp" ? "ورود" : "ثبت‌نام و ورود"}</Button>
        </form>
      </Card>
    </>
  );
}

export default function MeLogin() { return <Suspense fallback={null}><Login /></Suspense>; }
