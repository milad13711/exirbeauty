"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useMe } from "@/components/portal/PortalShell";
import { Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { actions } from "@/lib/db";

export default function MeProfile() {
  const me = useMe();
  const [name, setName] = useState(me?.name ?? "");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  if (!me) return null;
  return (
    <>
      <h1 className="text-xl font-extrabold">پروفایل من</h1>
      <Card>
        <CardHead title="عکس و مشخصات" hint="عکس شما فقط برای سالن دیده می‌شود" />
        <div className="space-y-4 px-5 pb-5">
          <PhotoPicker name={me.name} value={me.photo} size={88} onChange={(photo) => actions.setPhoto("customer", me.id, photo)} />
          <Field label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          <Field label="موبایل"><input value={me.phone} disabled dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <div className="flex items-center gap-3"><Button onClick={() => { if (name.trim().length < 3) return setErr("نام را کامل وارد کنید."); actions.saveCustomer({ ...me, name: name.trim() }); setErr(""); setOk(true); setTimeout(() => setOk(false), 2000); }}>ذخیره</Button>{ok && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span>}</div>
        </div>
      </Card>
      <ThemeToggle compact />
    </>
  );
}
