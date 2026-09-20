"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMeStaff } from "@/components/staff/StaffShell";
import { actions } from "@/lib/db";

export default function MyProfile() {
  const me = useMeStaff();
  const [bio, setBio] = useState(me?.bio ?? "");
  const [ok, setOk] = useState(false);
  if (!me) return null;
  return (
    <>
      <h1 className="text-xl font-extrabold">پروفایل من</h1>
      <Card>
        <CardHead title="عکس و معرفی" hint="عکس شما در فرم رزرو و تقویم سالن نمایش داده می‌شود" />
        <div className="space-y-4 px-5 pb-5">
          <PhotoPicker name={me.name} value={me.photo} color={me.color} size={88} onChange={(photo) => actions.setPhoto("staff", me.id, photo)} />
          <div><p className="text-sm font-bold">{me.name}</p><p className="text-xs text-ink3">{me.role} · {me.phone}</p></div>
          <Field label="درباره‌ی من (در صفحه‌ی رزرو)"><textarea rows={3} maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="مثلاً ۸ سال سابقه‌ی رنگ و مش" className={fieldCls} /></Field>
          <div className="flex items-center gap-3"><Button onClick={() => { actions.saveStaff({ ...me, bio: bio.trim() }); setOk(true); setTimeout(() => setOk(false), 2000); }}>ذخیره</Button>{ok && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span>}</div>
        </div>
      </Card>
      <ThemeToggle compact />
    </>
  );
}
