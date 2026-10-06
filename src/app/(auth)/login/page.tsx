"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import clsx from "clsx";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { actions } from "@/lib/db";
import { crm } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { digits, isEmail, isPhone } from "@/lib/validate";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [who, setWho] = useState<"owner" | "admin">("owner");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = (fallback: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : fallback);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr("");
    try { await fn(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  const sendCode = () => {
    if (!isPhone(phone)) return setErr("شماره موبایل را درست وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).");
    return run(async () => { await crm.otpRequest(digits(phone).replace(/\s/g, "")); setSent(true); });
  };
  const ownerLogin = () => {
    if (!/^\d{6}$/.test(digits(code))) return setErr("کد تأیید ۶ رقمی است.");
    return run(async () => {
      const u = await crm.otpVerify(digits(phone).replace(/\s/g, ""), digits(code));
      actions.login("owner", u.name); // keeps the not-yet-migrated screens (still on the prototype data) signed in
      router.push(dest("/calendar"));
    });
  };
  const adminLogin = () => {
    if (!isEmail(email) || pass.length < 6) return setErr("ایمیل معتبر و رمز حداقل ۶ کاراکتری وارد کنید.");
    return run(async () => {
      const u = await crm.login(email.trim(), pass);
      actions.login("admin", u.name);
      router.push("/admin");
    });
  };

  return (
    <Card className="mx-auto max-w-md p-6 shadow-[var(--shadow-pop)]">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-surface2 p-1" role="tablist">
        {([["owner", "ورود سالن‌دار"], ["admin", "ورود ادمین"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={who === k} onClick={() => { setWho(k); setErr(""); }} className={clsx("press min-h-10 cursor-pointer rounded-full text-[13px] font-bold", who === k ? "bg-surface text-rosedeep shadow-sm" : "text-ink2")}>{l}</button>
        ))}
      </div>

      {who === "owner" ? (
        <form onSubmit={(e) => { e.preventDefault(); if (sent) ownerLogin(); else sendCode(); }} className="space-y-4">
          <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={sent} inputMode="tel" dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} autoComplete="tel" /></Field>
          {sent && (
            <>
              <Field label="کد تأیید ۶ رقمی"><input autoFocus value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" dir="ltr" maxLength={6} style={{ textAlign: "center", letterSpacing: "0.4em" }} className={fieldCls} autoComplete="one-time-code" /></Field>
              <p className="text-xs text-ink3">کد از طریق پیامک برای {phone} ارسال شد؛ تا ۲ دقیقه معتبر است. <button type="button" onClick={() => { setSent(false); setCode(""); }} className="cursor-pointer font-semibold text-rose">ویرایش شماره</button></p>
            </>
          )}
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full !min-h-12">{busy ? "لطفاً صبر کنید…" : sent ? "ورود" : "دریافت کد تأیید"}</Button>
          <p className="text-center text-sm text-ink2">پرسنل سالن هستید؟ <Link href="/my/login" className="font-bold text-rose">ورود پرسنل</Link></p>
          <p className="text-center text-sm text-ink2">سالن جدید هستید؟ <Link href="/signup" className="font-bold text-rose">ثبت‌نام و شروع دوره‌ی آزمایشی</Link></p>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); adminLogin(); }} className="space-y-4">
          <Field label="ایمیل"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" dir="ltr" placeholder="admin@example.com" style={{ textAlign: "right" }} className={fieldCls} autoComplete="username" /></Field>
          <Field label="رمز عبور"><input value={pass} onChange={(e) => setPass(e.target.value)} type="password" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} autoComplete="current-password" /></Field>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <Button type="submit" disabled={busy} className="w-full !min-h-12">{busy ? "لطفاً صبر کنید…" : "ورود به پنل ادمین"}</Button>
        </form>
      )}
    </Card>
  );
}

export default function Login() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
