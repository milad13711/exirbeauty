import { AlertTriangle, Truck } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";
import { fa, short } from "@/lib/fa";

const stock = [
  { n: "اکسیدان ۶٪", left: 2, min: 6, last: 300_000, from: "پخش رز", low: true },
  { n: "رنگ مو ۷.۳", left: 5, min: 8, last: 420_000, from: "پخش رز", low: true },
  { n: "کراتین", left: 3, min: 3, last: 950_000, from: "آرین‌مد", low: false },
  { n: "دستکش نیتریل", left: 14, min: 5, last: 420_000, from: "بهداشت‌پارس", low: false },
];
const orders = [["۱۴ شهریور", "پخش رز", 6_800_000, "تحویل‌شده"], ["۲ شهریور", "آرین‌مد", 4_750_000, "تحویل‌شده"]] as const;

export default function Procurement() {
  return (
    <>
      <PageTitle title="تأمین و خرید عمده" sub="چه چیزی کم شده؟ از کجا بخرم؟ آخرین قیمت چه بود؟" actions={<Button><Truck size={14} />ساخت سفارش پیشنهادی</Button>} />
      <Card className="mb-5 flex items-center gap-3 bg-ambersoft px-5 py-4"><AlertTriangle className="text-amber" /><p className="text-sm">موجودی اکسیدان کمتر از حد تعیین‌شده است ← <b>پیشنهاد سفارش ۱۲ عدد از پخش رز</b></p></Card>
      <Card>
        <CardHead title="موجودی و تأمین‌کننده" />
        <ul className="divide-y divide-line border-t border-line md:hidden">
          {stock.map((s) => (
            <li key={s.n} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1"><b className="block">{s.n}</b><span className="block text-xs text-ink3">موجودی {fa(s.left)} از حداقل {fa(s.min)} · {s.from} · {short(s.last)}</span></span>{s.low ? <Badge tone="danger">سفارش بده</Badge> : <Badge tone="sage">کافی</Badge>}</li>
          ))}
        </ul>
        <div className="hidden md:block"><table className="w-full text-sm">
          <thead className="border-y border-line text-right text-xs text-ink3"><tr>{["کالا", "موجودی", "حداقل", "آخرین قیمت خرید", "تأمین‌کننده", ""].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>{stock.map((s) => (
            <tr key={s.n} className="border-b border-line/60 last:border-0"><td className="px-5 py-3 font-semibold">{s.n}</td><td className="px-5">{fa(s.left)}</td><td className="px-5 text-ink3">{fa(s.min)}</td><td className="px-5">{short(s.last)}</td><td className="px-5 text-ink2">{s.from}</td><td className="px-5">{s.low ? <Badge tone="danger">سفارش بده</Badge> : <Badge tone="sage">کافی</Badge>}</td></tr>))}</tbody>
        </table></div>
      </Card>
      <Card className="mt-5"><CardHead title="سفارش‌های قبلی" /><ul className="divide-y divide-line">{orders.map((o) => <li key={o[0]} className="flex justify-between px-5 py-3 text-sm"><span>{o[0]} · {o[1]}</span><span><b>{short(o[2])}</b> <Badge tone="sage">{o[3]}</Badge></span></li>)}</ul></Card>
    </>
  );
}
