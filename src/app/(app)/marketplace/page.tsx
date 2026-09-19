import { MapPin, Search, Star } from "lucide-react";
import { Avatar, Badge, Button, Card, PageTitle } from "@/components/ui";
import { fa, short } from "@/lib/fa";
import { staff } from "@/lib/mock";

export default function Marketplace() {
  return (
    <>
      <PageTitle title="مارکت‌پلیس متخصص‌ها" sub="فاز بعدی: مشتری «بهترین متخصص رنگ مو نزدیک من» را پیدا می‌کند" />
      <div className="relative mb-5 max-w-xl"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3" /><input aria-label="جستجو" defaultValue="بهترین متخصص رنگ مو نزدیک من" className="w-full rounded-xl border border-line bg-surface py-2.5 pr-9 pl-3 text-sm" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.slice(0, 3).map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-center gap-3"><Avatar name={s.name} color={s.color} size={48} /><div><p className="font-bold">{s.name}</p><p className="text-xs text-ink3">{s.role}</p></div></div>
            <div className="mt-3 flex items-center gap-3 text-sm text-ink2"><span className="inline-flex items-center gap-1 font-bold text-gold"><Star size={13} fill="currentColor" />{fa(s.rating)}</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{fa(2)} کیلومتر</span></div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-rosesoft to-goldsoft" />)}</div>
            <p className="mt-3 text-xs text-ink3">از {short(650_000)} · اولین وقت خالی: فردا ۱۱:۰۰</p>
            <div className="mt-3 flex items-center justify-between"><Badge tone="sage">وقت خالی دارد</Badge><Button>رزرو</Button></div>
          </Card>
        ))}
      </div>
    </>
  );
}
