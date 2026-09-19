import { Check, Crown, RefreshCw } from "lucide-react";
import { Badge, Button, Card, PageTitle, Stat } from "@/components/ui";
import { fa, short } from "@/lib/fa";

const plans = [
  { n: "Beauty Membership", price: 999_000, members: 46, hot: true, perks: ["یک فیشال در ماه", "۱۰٪ تخفیف خدمات", "امتیاز دو برابر", "۱۰٪ تخفیف فروشگاه", "هدیه تولد", "اولویت رزرو"] },
  { n: "Hair Care Club", price: 1_490_000, members: 31, hot: false, perks: ["یک ماسک و براشینگ در ماه", "۱۵٪ تخفیف رنگ و کراتین", "مشاوره‌ی رایگان مو", "اولویت رزرو"] },
  { n: "Nail Lover", price: 590_000, members: 19, hot: false, perks: ["دو مانیکور در ماه", "۱۰٪ تخفیف ژل"] },
];

export default function Memberships() {
  return (
    <>
      <PageTitle title="پکیج و عضویت" sub="درآمد تکرارشونده برای سالن" actions={<Button>+ پلن جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعضای فعال" value={fa(96)} tone="rose" icon={<Crown size={16} />} />
        <Stat label="درآمد ماهانه تکرارشونده" value={short(101_000_000)} tone="sage" icon={<RefreshCw size={16} />} />
        <Stat label="نرخ تمدید" value="۸۶٪" tone="gold" />
        <Stat label="لغو این ماه" value={fa(4)} tone="danger" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.n} className={p.hot ? "border-rose ring-1 ring-rose" : ""}>
            <div className="p-5">
              <div className="flex items-center justify-between"><h3 className="font-bold">{p.n}</h3>{p.hot && <Badge tone="rose">محبوب‌ترین</Badge>}</div>
              <p className="mt-3 text-2xl font-extrabold">{short(p.price)} <span className="text-xs font-medium text-ink3">تومان / ماه</span></p>
              <ul className="mt-4 space-y-2 text-sm">{p.perks.map((x) => <li key={x} className="flex items-center gap-2"><Check size={15} className="text-sage" />{x}</li>)}</ul>
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink3">{fa(p.members)} عضو فعال</p>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
