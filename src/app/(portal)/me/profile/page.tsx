"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { useMe } from "@/components/portal/PortalShell";
import { Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { errorText } from "@/lib/api";
import { portal } from "@/lib/portalApi";

export default function MeProfile() {
  const me = useMe();
  const [name, setName] = useState(me.name); const [birth, setBirth] = useState(me.birthDate ?? "");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  async function save() {
    setErr(""); setOk(false);
    if (name.trim().length < 3) return setErr("نام را کامل وارد کنید.");
    setBusy(true);
    try { await portal.updateMe({ name: name.trim(), birthDate: birth || null }); setOk(true); setTimeout(() => window.location.reload(), 600); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <h1 className="text-xl font-extrabold">پروفایل من</h1>
      <Card>
        <CardHead title="مشخصات" hint="این اطلاعات فقط برای سالن دیده می‌شود" />
        <div className="space-y-4 px-5 pb-5">
          <Field label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          <Field label="تاریخ تولد (برای پیام تبریک)"><input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} dir="ltr" className={fieldCls} /></Field>
          <Field label="موبایل"><input value={me.phone} disabled dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <div className="flex items-center gap-3"><Button disabled={busy} onClick={save}>ذخیره</Button>{ok && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span>}</div>
        </div>
      </Card>
      <ThemeToggle compact />
    </>
  );
}
