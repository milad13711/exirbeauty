import { Camera, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";

const kinds = ["عکس قبل/بعد", "نمونه کار", "معرفی خدمات", "پیشنهاد ویژه", "تولد مشتری", "محتوای آموزشی"];

export default function Content() {
  return (
    <>
      <PageTitle title="تولید محتوا" sub="از داخل سیستم منتشر کنید؛ AI کپشن و استوری می‌سازد" />
      <div className="mb-5 flex flex-wrap gap-2">{kinds.map((k, i) => <Badge key={k} tone={i === 0 ? "rose" : "neutral"} className="!px-3.5 !py-1.5 !text-[13px]">{k}</Badge>)}</div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="پست جدید" />
          <div className="space-y-3 px-5 pb-5">
            <div className="grid grid-cols-2 gap-2">{["قبل", "بعد"].map((t, i) => <div key={t} className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-line" style={{ background: i ? "linear-gradient(160deg,#f7e4ea,#f6ecd6)" : "#efe6df" }}><span className="text-center text-xs text-ink3"><Camera className="mx-auto mb-1" size={20} />{t}</span></div>)}</div>
            <Button variant="ghost" className="w-full"><Sparkles size={14} />ساخت کپشن با AI</Button>
            <div className="rounded-xl bg-rosesoft p-3 text-sm leading-7">✨ تغییر رنگ، تغییر حال! بالیاژ کاراملی با دست مریم 💛 برای رزرو نوبت به لینک پروفایل سر بزن.<br />#بالیاژ #سالن_زیبایی</div>
            <div className="flex gap-2"><Button className="flex-1">انتشار در اینستاگرام</Button><Button variant="ghost">زمان‌بندی</Button></div>
            <p className="text-xs text-ink3">انتشار عکس مشتری فقط با رضایت ثبت‌شده‌ی او انجام می‌شود.</p>
          </div>
        </Card>
        <Card><CardHead title="تقویم محتوا" /><ul className="divide-y divide-line text-sm">{[["امروز", "استوری پیشنهاد ویژه ژل", "برنامه‌ریزی‌شده"], ["فردا", "قبل/بعد بالیاژ", "پیش‌نویس"], ["پنجشنبه", "نکته‌ی مراقبت از رنگ", "پیش‌نویس"]].map((x) => <li key={x[1]} className="flex items-center justify-between px-5 py-3"><span><b>{x[1]}</b><span className="block text-xs text-ink3">{x[0]}</span></span><Badge tone={x[2] === "برنامه‌ریزی‌شده" ? "sage" : "neutral"}>{x[2]}</Badge></li>)}</ul></Card>
      </div>
    </>
  );
}
