"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Plus, Send } from "lucide-react";
import { Avatar, Badge, Button, Card, PageTitle, tierTone } from "@/components/ui";
import { customers } from "@/lib/mock";
import { fa, short } from "@/lib/fa";

const filters = [
  { k: "all", l: "همه" },
  { k: "hot", l: "زمان مراجعه رسیده" },
  { k: "lost", l: "در حال از دست رفتن" },
  { k: "vip", l: "VIP" },
] as const;

const riskBadge = {
  ok: <Badge tone="sage">فعال</Badge>,
  hot: <Badge tone="amber">وقتش رسیده</Badge>,
  lost: <Badge tone="danger">در خطر ریزش</Badge>,
} as const;

export default function Customers() {
  const [f, setF] = useState<(typeof filters)[number]["k"]>("all");
  const rows = customers.filter((c) => {
    return f === "all" || (f === "vip" ? c.tier === "VIP" : c.risk === f);
  });
  return (
    <>
      <PageTitle title="مشتریان" sub={`${fa(customers.length)} مشتری · سیستم زمان احتمالی مراجعه بعدی را پیش‌بینی می‌کند`}
        actions={<><Button variant="ghost"><Send size={14} />پیام گروهی</Button><Button><Plus size={14} />مشتری جدید</Button></>} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {filters.map((x) => (
          <button key={x.k} role="tab" aria-selected={f === x.k} onClick={() => setF(x.k)}
            className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              f === x.k ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{x.l}</button>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-right text-xs text-ink3">
            <tr>{["مشتری", "سطح", "مراجعات", "مجموع خرید", "آخرین مراجعه", "خدمت موردعلاقه", "وضعیت"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-surface2/60">
                <td className="px-5 py-3">
                  <Link href={c.id === "c1" ? "/customers/c1" : "#"} className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <span><b className="block text-ink">{c.name}</b><bdi dir="ltr" className="text-xs text-ink3">{c.phone}</bdi></span>
                  </Link>
                </td>
                <td className="px-5"><Badge tone={tierTone[c.tier]}>{c.tier}</Badge></td>
                <td className="px-5">{fa(c.visits)}</td>
                <td className="px-5 font-semibold">{short(c.total)}</td>
                <td className="px-5 text-ink2">{c.lastVisit} <span className="text-xs text-ink3">({fa(c.lastVisitDays)} روز پیش)</span></td>
                <td className="px-5 text-ink2">{c.favService}</td>
                <td className="px-5">{riskBadge[c.risk]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-ink3">نمونه: برای مشاهده‌ی پروفایل کامل روی «سارا محمدی» کلیک کنید.</p>
    </>
  );
}
