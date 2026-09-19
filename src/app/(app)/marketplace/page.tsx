"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { actions, useDB } from "@/lib/db";
import { fa } from "@/lib/fa";

export default function Marketplace() {
  const db = useDB();
  const [bio, setBio] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const listed = db.staff.filter((s) => s.active && s.listed !== false).length;

  return (
    <>
      <PageTitle title="مارکت‌پلیس متخصص‌ها" sub="پروفایل عمومی متخصص‌های سالن در صفحه‌ی جستجوی اکسیر نمایش داده می‌شود" actions={<Link href="/explore" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2"><Eye size={14} />دیدن صفحه‌ی عمومی</Link>} />
      <Card className="mb-5 p-5 text-sm leading-7 text-ink2">{fa(listed)} از {fa(db.staff.filter((s) => s.active).length)} متخصص شما در مارکت‌پلیس نمایش داده می‌شوند. مشتری با امتیاز واقعی، قیمت خدمات و اولین وقت خالی هر متخصص را می‌بیند و مستقیم رزرو می‌کند.</Card>
      <div className="grid gap-4 md:grid-cols-2">
        {db.staff.filter((s) => s.active).map((s) => {
          const on = s.listed !== false;
          const text = bio[s.id] ?? s.bio ?? "";
          const svcs = db.services.filter((x) => x.active && x.staff.includes(s.id));
          return (
            <Card key={s.id}>
              <CardHead title={s.name} hint={s.role} action={<span className="flex items-center gap-2 text-xs text-ink2">{on ? <Eye size={14} className="text-sage" /> : <EyeOff size={14} />}<Toggle on={on} label={`نمایش ${s.name} در مارکت‌پلیس`} onChange={(v) => actions.saveStaff({ ...s, listed: v })} /></span>} />
              <div className="space-y-3 px-5 pb-5">
                <div className="flex flex-wrap items-center gap-2"><Avatar name={s.name} color={s.color} size={34} />{s.rating > 0 && <Badge tone="gold">★ {fa(String(s.rating).replace(".", "٫"))}</Badge>}<Badge>{fa(svcs.length)} خدمت</Badge></div>
                <Field label="معرفی کوتاه (نمایش عمومی)"><textarea rows={3} value={text} onChange={(e) => { setBio({ ...bio, [s.id]: e.target.value }); setSaved(null); }} placeholder="مثلاً متخصص رنگ و بالیاژ با ۸ سال سابقه…" className={fieldCls} /></Field>
                <div className="flex items-center gap-3"><Button variant="soft" onClick={() => { actions.saveStaff({ ...s, bio: text.trim() }); setSaved(s.id); }}>ذخیره</Button>{saved === s.id && <span role="status" className="text-xs font-bold text-sage">ذخیره شد ✓</span>}{on && <Link href={`/explore/own-${s.id}`} className="mr-auto text-[13px] font-semibold text-rose">پروفایل عمومی ←</Link>}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
