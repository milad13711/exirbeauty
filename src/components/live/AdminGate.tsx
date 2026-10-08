"use client";
import { useState, type ReactNode } from "react";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { finderApi } from "@/lib/finderApi";
import { useQuery } from "@/lib/useQuery";
import { Spinner } from "./ui";

/** Platform-admin screens that talk to the real API: they need a real ADMIN session (separate from the prototype's mock admin login). */
export function AdminGate({ children }: { children: ReactNode }) {
  const me = useQuery(() => crm.me().catch(() => null), []);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() { setBusy(true); setErr(""); try { await finderApi.login(email, password); await me.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  if (me.loading && !me.data && !me.error) return <Spinner />;
  if (me.data && (me.data.role === "ADMIN" || me.data.role === "SUPER_ADMIN")) return <>{children}</>;
  return (
    <Card className="mx-auto mt-10 max-w-sm p-6">
      <h2 className="font-extrabold text-ink">ورود به سرویس مدیریت</h2>
      <p className="mt-1 text-xs leading-6 text-ink3">این بخش با حساب ادمین سرور کار می‌کند.</p>
      <div className="mt-4 space-y-3">
        <Field label="ایمیل"><input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} autoComplete="username" /></Field>
        <Field label="رمز عبور"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && go()} /></Field>
        {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <Button className="w-full" onClick={go} disabled={busy || !email || !password}>ورود</Button>
      </div>
    </Card>
  );
}
