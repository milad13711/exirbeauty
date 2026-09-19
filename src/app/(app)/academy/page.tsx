import { BookOpen, PlayCircle } from "lucide-react";
import { Badge, Card, CardHead, PageTitle } from "@/components/ui";

const owner = ["مدیریت سالن", "افزایش فروش", "جذب مشتری", "مدیریت پرسنل", "قیمت‌گذاری", "سیستم‌سازی"];
const pro = ["آموزش تکنیک", "ترندها", "محصولات", "فروش خدمات", "ارتباط با مشتری"];
const list = [["چطور خدمات را قیمت‌گذاری کنیم؟", "مدیر", "۱۸ دقیقه"], ["ترند بالیاژ ۱۴۰۵", "متخصص", "۱۲ دقیقه"], ["فروش محصول بعد از خدمت", "متخصص", "۱۰ دقیقه"], ["سیستم بازگشت مشتری", "مدیر", "۲۲ دقیقه"]];

export default function Academy() {
  return (
    <>
      <PageTitle title="آکادمی" sub="آموزش برای مدیر سالن و متخصص؛ در آینده Beauty Academy" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHead title="برای مدیر سالن" /><div className="flex flex-wrap gap-2 px-5 pb-5">{owner.map((x) => <Badge key={x} tone="rose">{x}</Badge>)}</div></Card>
        <Card><CardHead title="برای متخصص" /><div className="flex flex-wrap gap-2 px-5 pb-5">{pro.map((x) => <Badge key={x} tone="sage">{x}</Badge>)}</div></Card>
      </div>
      <Card className="mt-5"><CardHead title="آموزش‌های پیشنهادی" action={<BookOpen size={16} className="text-ink3" />} />
        <ul className="divide-y divide-line">{list.map((l) => <li key={l[0]} className="flex items-center gap-3 px-5 py-3 text-sm"><PlayCircle className="text-rose" /><span className="flex-1 font-semibold">{l[0]}</span><Badge>{l[1]}</Badge><span className="text-xs text-ink3">{l[2]}</span></li>)}</ul></Card>
    </>
  );
}
