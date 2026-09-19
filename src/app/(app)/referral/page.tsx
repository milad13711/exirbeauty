import { Copy, Link2, Share2, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { fa, short } from "@/lib/fa";

const top = [
  { n: "سارا محمدی", type: "مشتری", c: 6, rev: 11_400_000 },
  { n: "مریم حسینی", type: "متخصص", c: 9, rev: 17_800_000 },
  { n: "پریسا نوری", type: "مشتری", c: 4, rev: 7_200_000 },
  { n: "الهام رضایی", type: "متخصص", c: 5, rev: 9_600_000 },
];
const flow = ["سارا لینک اختصاصی را می‌فرستد", "دوست وارد لینک می‌شود و ثبت‌نام می‌کند", "اولین خرید دوست انجام می‌شود", "سیستم خودکار پاداش می‌دهد"];

export default function Referral() {
  return (
    <>
      <PageTitle title="معرفی دوستان (Referral)" sub="مشتری ← مشتری و متخصص ← مشتری؛ موتور بازاریابی ویروسی سالن" actions={<Button>تنظیم پاداش‌ها</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="مشتری جدید از معرفی" value={fa(37)} sub="این ماه" tone="sage" icon={<UserPlus size={16} />} />
        <Stat label="درآمد ناشی از معرفی" value={short(46_000_000)} tone="rose" />
        <Stat label="نرخ تبدیل لینک" value="۳۲٪" tone="gold" />
        <Stat label="معرف‌های فعال" value={fa(58)} tone="sky" icon={<Share2 size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="پاداش‌ها" hint="به‌صورت خودکار پس از اولین خرید" />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <div className="rounded-xl bg-rosesoft p-4"><p className="text-xs text-rosedeep">معرف (مشتری)</p><p className="mt-1 text-lg font-extrabold text-rosedeep">۱۰۰ امتیاز</p></div>
            <div className="rounded-xl bg-goldsoft p-4"><p className="text-xs text-gold">دوست معرفی‌شده</p><p className="mt-1 text-lg font-extrabold text-gold">۱۰٪ تخفیف</p></div>
            <div className="rounded-xl bg-sagesoft p-4 sm:col-span-2"><p className="text-xs text-sage">معرف (متخصص)</p><p className="mt-1 text-lg font-extrabold text-sage">۵٪ پورسانت از اولین فاکتور</p></div>
          </div>
        </Card>
        <Card>
          <CardHead title="مسیر معرفی" />
          <ol className="space-y-3 px-5 pb-5">
            {flow.map((f, i) => <li key={f} className="flex items-center gap-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-rose text-xs font-bold text-white">{fa(i + 1)}</span>{f}</li>)}
          </ol>
        </Card>
        <Card>
          <CardHead title="لینک اختصاصی نمونه" action={<Link2 size={16} className="text-ink3" />} />
          <div className="px-5 pb-5">
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-rose/50 bg-rosesoft/50 p-3"><bdi dir="ltr" className="flex-1 truncate text-sm text-rosedeep">rose.exirbeauty.ir/r/sara-m</bdi><Button variant="ghost"><Copy size={14} />کپی</Button></div>
            <p className="mt-3 text-xs text-ink3">هر مشتری و هر متخصص لینک مخصوص خودش را در پنل مشتری دارد.</p>
          </div>
        </Card>
        <Card>
          <CardHead title="برترین معرف‌ها" />
          <ul className="divide-y divide-line">
            {top.map((t) => (
              <li key={t.n} className="flex items-center gap-3 px-5 py-3"><Avatar name={t.n} size={34} /><div className="flex-1"><p className="text-sm font-semibold">{t.n} <Badge tone={t.type === "متخصص" ? "sage" : "rose"}>{t.type}</Badge></p><p className="text-xs text-ink3">{fa(t.c)} مشتری جدید</p></div><b className="text-sm">{short(t.rev)}</b></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
