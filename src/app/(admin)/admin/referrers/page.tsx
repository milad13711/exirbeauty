import { Card, PageTitle } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { CRM_PLAN, salons } from "@/lib/mock3";
import { fa, short, toman } from "@/lib/fa";

export default function Referrers() {
  return (
    <>
      <PageTitle title="سالن‌های معرف" sub={`کیف پول هر سالن برای پرداخت اشتراک ${toman(CRM_PLAN.price)} در ماه استفاده می‌شود`} />
      <Card>
        <DataList rows={salons} id={(s) => s.id} cols={[
          { h: "سالن", title: true, cell: (s) => <>{s.name} <span className="text-xs font-normal text-ink3">· {s.city}</span></> },
          { h: "کد معرف", cell: (s) => <bdi dir="ltr" className="text-xs text-ink2">?ref={s.code}</bdi> },
          { h: "مسئول", cell: (s) => s.owner },
          { h: "سفارش‌ها", cell: (s) => fa(s.orders) },
          { h: "فروش", cell: (s) => <b>{short(s.sales)}</b> },
          { h: "پورسانت در انتظار", cell: (s) => short(s.pending) },
          { h: "کیف پول", cell: (s) => <b className="text-sage">{toman(s.wallet)}</b> },
          { h: "پوشش اشتراک", cell: (s) => { const c = Math.min(100, Math.round((s.wallet / CRM_PLAN.price) * 100)); return <span className="inline-flex items-center gap-2"><span className="h-2 w-16 rounded-full bg-surface2"><span className="block h-2 rounded-full bg-sage" style={{ width: `${c}%` }} /></span>{fa(c)}٪</span>; } },
        ]} />
      </Card>
    </>
  );
}
