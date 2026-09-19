import { ArrowLeft, Wand2 } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";
import { short } from "@/lib/fa";

const rules = [
  { svc: "کراتین", why: "برای حفظ نتیجه‌ی کراتین", items: [["شامپو بدون سولفات", 650_000], ["ماسک ترمیم", 780_000], ["سرم نگهدارنده", 900_000]] },
  { svc: "رنگ مو", why: "برای ماندگاری رنگ", items: [["شامپو ضدرنگ‌پریدگی", 620_000], ["ماسک رنگ", 780_000]] },
  { svc: "فیشال", why: "با توجه به نوع پوست مشتری (ترکیبی)", items: [["سرم ویتامین C", 1_150_000], ["ضدآفتاب SPF50", 540_000], ["ژل شست‌وشو", 420_000]] },
];

export default function Recommend() {
  return (
    <>
      <PageTitle title="توصیه هوشمند محصول" sub="خدمت ← توصیه ← محصول ← درآمد" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {rules.map((r) => (
            <Card key={r.svc}>
              <CardHead title={`بعد از «${r.svc}»`} hint={r.why} action={<Badge tone="rose">قانون فعال</Badge>} />
              <div className="flex flex-wrap gap-2 px-5 pb-5">{r.items.map(([n, p]) => <span key={n} className="rounded-xl border border-line px-3 py-2 text-sm">{n} <b className="mr-1 text-ink2">{short(+p)}</b></span>)}</div>
            </Card>
          ))}
          <Button variant="ghost">+ قانون جدید</Button>
        </div>
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHead title="پیام مشتری پس از خدمت" action={<Wand2 size={16} className="text-rose" />} />
          <div className="space-y-3 px-5 pb-5">
            <div className="rounded-2xl rounded-br-sm bg-sagesoft p-4 text-sm leading-7">سارا جان، از کراتین‌تان راضی بودید؟ 🌸 برای حفظ نتیجه‌ی کراتین، این ۳ محصول به شما پیشنهاد می‌شود:</div>
            {["شامپو بدون سولفات", "ماسک ترمیم", "سرم نگهدارنده"].map((n) => <div key={n} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm">{n}<span className="inline-flex items-center gap-1 font-semibold text-rose">خرید با یک کلیک <ArrowLeft size={13} /></span></div>)}
            <p className="text-xs text-ink3">نرخ تبدیل توصیه‌ها این ماه: ۲۷٪ · درآمد ایجادشده: ۹٫۴ میلیون</p>
          </div>
        </Card>
      </div>
    </>
  );
}
