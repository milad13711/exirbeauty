import { EyeOff, Globe, Lock, Star } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { fa } from "@/lib/fa";

const items = [
  { n: "دنیا ابراهیمی", s: "رنگ ریشه · مریم حسینی", r: 5, t: "عالی بود، دقیقاً همون رنگی که می‌خواستم.", ok: "public" },
  { n: "ژاله فرهادی", s: "فیشال هیدرا · الهام رضایی", r: 5, t: "پوستم خیلی روشن شد.", ok: "public" },
  { n: "الناز جعفری", s: "ژل و لاک · سارا احمدی", r: 2, t: "کمی معطل شدم و لاک زود پرید.", ok: "private" },
  { n: "مهسا کاظمی", s: "کراتین · نازنین کریمی", r: 4, t: "خوب بود اما قیمت بالا بود.", ok: "private" },
];

export default function Reviews() {
  return (
    <>
      <PageTitle title="نظرسنجی و اعتبار سالن" sub="رضایت بالا ← درخواست نظر عمومی · رضایت پایین ← پیام خصوصی به مدیر" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="میانگین رضایت" value="۴٫۷ از ۵" tone="gold" icon={<Star size={16} />} />
        <Stat label="نظرسنجی‌های ماه" value={fa(186)} tone="sky" />
        <Stat label="نظر عمومی ثبت‌شده" value={fa(64)} tone="sage" icon={<Globe size={16} />} />
        <Stat label="مشکل‌های خصوصی باز" value={fa(2)} tone="danger" icon={<Lock size={16} />} />
      </div>
      <Card className="mt-5">
        <CardHead title="مسیریابی هوشمند بازخورد" />
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-3">
          <div className="rounded-xl border border-line p-4 text-sm"><b>۱. بعد از خدمت</b><p className="mt-1 text-ink2">«از تجربه امروزتان چقدر راضی بودید؟» (۱ تا ۵ ستاره)</p></div>
          <div className="rounded-xl bg-sagesoft p-4 text-sm"><b className="text-sage">۴ و ۵ ستاره</b><p className="mt-1 text-ink2">درخواست ثبت نظر عمومی در گوگل‌مپ</p></div>
          <div className="rounded-xl bg-dangersoft p-4 text-sm"><b className="text-danger">۱ تا ۳ ستاره</b><p className="mt-1 text-ink2">پیام خصوصی به مدیر سالن، پیش از نظر منفی عمومی</p></div>
        </div>
      </Card>
      <Card className="mt-5">
        <CardHead title="بازخوردهای اخیر" />
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.n} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <Avatar name={i.n} size={38} />
              <div className="min-w-0 flex-1"><p className="text-sm font-bold">{i.n} <span className="text-xs font-normal text-ink3">· {i.s}</span></p><p className="mt-0.5 text-sm text-ink2">{i.t}</p></div>
              <span className="inline-flex text-gold" aria-label={`${i.r} ستاره`}>{Array.from({ length: 5 }, (_, k) => <Star key={k} size={14} fill={k < i.r ? "currentColor" : "none"} />)}</span>
              {i.ok === "public" ? <Badge tone="sage"><Globe size={11} />درخواست نظر عمومی ارسال شد</Badge> : <><Badge tone="danger"><EyeOff size={11} />خصوصی</Badge><Button variant="soft">تماس با مشتری</Button></>}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
