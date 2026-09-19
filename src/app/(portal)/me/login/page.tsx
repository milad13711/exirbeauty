"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flower2 } from "lucide-react";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { portal } from "@/lib/portal";
import { DEMO_OTP, digits, isPhone } from "@/lib/validate";

export default function MeLogin() {
  const router = useRouter();
  const db = useDB();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const next = () => {
    setErr("");
    if (step === "phone") { if (!isPhone(phone)) return setErr("شماره موبایل را درست وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)."); setStep("otp"); return; }
    if (step === "otp") {
      if (digits(code) !== DEMO_OTP) return setErr("کد تأیید اشتباه است.");
      const c = portal.findByPhone(phone);
      if (c) { portal.login(c.id); router.push("/me"); } else setStep("name");
      return;
    }
    if (name.trim().length < 3) return setErr("نام و نام خانوادگی را وارد کنید.");
    const ref = new URLSearchParams(window.location.search).get("ref") ?? undefined;
    portal.register(name.trim(), phone, ref);
    router.push("/me");
  };

  return (
    <>
      <div className="mb-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose text-white"><Flower2 size={26} /></span><h1 className="mt-3 text-xl font-extrabold">{db.salon.name}</h1><p className="text-sm text-ink2">پنل مشتری؛ نوبت‌ها، امتیازها و کیف پول شما</p></div>
      <Card className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-4">
          <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={step !== "phone"} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} autoComplete="tel" /></Field>
          {step === "otp" && <Field label="کد تأیید ۵ رقمی"><input autoFocus value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" dir="ltr" maxLength={5} style={{ textAlign: "center", letterSpacing: "0.4em" }} className={fieldCls} autoComplete="one-time-code" /></Field>}
          {step === "name" && <><p className="rounded-xl bg-rosesoft p-3 text-sm text-rosedeep">اولین بار است که وارد می‌شوید؛ لطفاً نام خود را بنویسید.</p><Field label="نام و نام خانوادگی"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} autoComplete="name" /></Field></>}
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <Button type="submit" className="w-full !py-3">{step === "phone" ? "دریافت کد تأیید" : step === "otp" ? "ورود" : "ثبت‌نام و ورود"}</Button>
          {step === "otp" && <p className="text-center text-xs text-ink3">نسخه‌ی نمایشی: کد <b>{DEMO_OTP}</b> · نمونه شماره: 09123456789</p>}
        </form>
      </Card>
    </>
  );
}
