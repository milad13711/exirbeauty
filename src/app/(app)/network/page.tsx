"use client";
import { useState } from "react";
import { Armchair, Briefcase, Camera, Check, Landmark, Lightbulb, Megaphone, Palette, Shield, UserPlus, Wrench } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { dayInfo } from "@/lib/dates";

const services = [
  { n: "بیمه", I: Shield, d: "بیمه‌ی مسئولیت سالن و بیمه‌ی تکمیلی پرسنل" },
  { n: "خدمات مالی", I: Landmark, d: "وام کسب‌وکار، دستگاه کارتخوان و حسابداری" },
  { n: "تجهیزات", I: Wrench, d: "خرید و تعمیر صندلی، دستگاه و ابزار سالن" },
  { n: "اجاره صندلی", I: Armchair, d: "اجاره‌ی صندلی یا فضا به متخصص‌های مستقل" },
  { n: "استخدام متخصص", I: UserPlus, d: "پیدا کردن آرایشگر، ناخن‌کار و پوست‌کار" },
  { n: "تأمین مواد", I: Briefcase, d: "رنگ، اکسیدان و مصرفی با قیمت عمده" },
  { n: "تبلیغات", I: Megaphone, d: "تبلیغات محلی و اینفلوئنسر" },
  { n: "عکاسی", I: Camera, d: "عکس نمونه‌کار و محتوای شبکه‌های اجتماعی" },
  { n: "طراحی", I: Palette, d: "لوگو، منو، تابلو و دکوراسیون" },
  { n: "مشاوره کسب‌وکار", I: Lightbulb, d: "مشاوره‌ی مالی، قیمت‌گذاری و رشد" },
] as const;
const tone = { "ثبت شد": "amber", "در حال بررسی": "sky", "پاسخ داده شد": "sage" } as const;

/** درخواست خدمت از شرکای پلتفرم؛ درخواست برای ادمین ثبت می‌شود و پیگیری با تماس/تیکت انجام می‌شود */
export default function Network() {
  const db = useDB();
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const leads = db.netLeads ?? [];
  const send = (cat: string) => { ops.requestNetwork(cat, note.trim()); setOpen(null); setNote(""); };

  return (
    <>
      <PageTitle title="شبکه خدمات جانبی" sub="سالن فقط نرم‌افزار نمی‌خرد؛ وارد یک شبکه‌ی تخصصی کسب‌وکار می‌شود. درخواست بدهید تا تیم اکسیر با شما تماس بگیرد" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map(({ n, I, d }) => {
          const pending = leads.filter((l) => l.cat === n && l.status !== "پاسخ داده شد").length;
          return (
            <Card key={n} className="flex flex-col p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-rosesoft text-rose"><I size={21} /></span>
              <p className="mt-3 font-bold">{n}</p>
              <p className="mt-1 flex-1 text-xs leading-6 text-ink2">{d}</p>
              {open === n ? (
                <div className="mt-3 space-y-2">
                  <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح کوتاه (اختیاری)" aria-label="توضیح درخواست" className={fieldCls} />
                  <div className="flex gap-2"><Button className="flex-1" onClick={() => send(n)}>ارسال درخواست</Button><Button variant="ghost" onClick={() => setOpen(null)}>انصراف</Button></div>
                </div>
              ) : pending ? <Badge tone="sky" className="mt-3 w-fit"><Check size={12} />درخواست شما در دست بررسی است</Badge>
                : <Button variant="soft" className="mt-3" onClick={() => { setOpen(n); setNote(""); }}>درخواست مشاوره</Button>}
            </Card>
          );
        })}
      </div>

      {leads.length > 0 && (
        <Card className="mt-5">
          <CardHead title="درخواست‌های شما" />
          <ul className="divide-y divide-line">
            {leads.slice(0, 8).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <b className="flex-1 basis-32">{l.cat}</b><span className="min-w-0 flex-[2] basis-40 truncate text-xs text-ink3">{l.note || "—"}</span>
                <span className="text-xs text-ink3">{l.day === 0 ? "امروز" : dayInfo(l.day).short}</span><Badge tone={tone[l.status]}>{l.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
