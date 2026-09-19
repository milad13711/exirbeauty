"use client";
import { useState } from "react";
import clsx from "clsx";
import { Badge, Button, Card, PageTitle, Stat, type Tone } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { plans, tenants as seed, type TStatus } from "@/lib/mock4";
import { fa, short, toman } from "@/lib/fa";

const tone: Record<TStatus, Tone> = { "فعال": "sage", "آزمایشی": "sky", "منقضی‌شده": "danger", "تعلیق": "neutral" };
const filters = ["همه", "فعال", "آزمایشی", "منقضی‌شده", "تعلیق"] as const;
const planName = (id: string) => plans.find((p) => p.id === id)!.name;

export default function Tenants() {
  const [rows, setRows] = useState(seed);
  const [f, setF] = useState<(typeof filters)[number]>("همه");
  const list = rows.filter((t) => f === "همه" || t.status === f);
  const mrr = rows.filter((t) => t.status === "فعال").reduce((a, t) => a + plans.find((p) => p.id === t.plan)!.price, 0);
  const setStatus = (id: string, status: TStatus) => setRows(rows.map((t) => (t.id === id ? { ...t, status } : t)));

  return (
    <>
      <PageTitle title="تننت‌ها (سالن‌های مشتری CRM)" sub="سالن‌هایی که اشتراک اکسیر بیوتی را خریده‌اند" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="کل تننت‌ها" value={fa(rows.length)} tone="rose" />
        <Stat label="فعال" value={fa(rows.filter((t) => t.status === "فعال").length)} tone="sage" />
        <Stat label="آزمایشی / منقضی" value={`${fa(rows.filter((t) => t.status === "آزمایشی").length)} / ${fa(rows.filter((t) => t.status === "منقضی‌شده").length)}`} tone="amber" />
        <Stat label="درآمد ماهانه (MRR)" value={short(mrr)} tone="gold" />
      </div>
      <div className="my-5 flex flex-wrap gap-2" role="tablist">
        {filters.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", f === x ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2")}>{x}</button>)}
      </div>
      <Card>
        <DataList rows={list} id={(t) => t.id} cols={[
          { h: "سالن", title: true, cell: (t) => <>{t.name} <span className="text-xs font-normal text-ink3">· {t.city} · {t.owner}</span></> },
          { h: "تلفن", cell: (t) => <bdi dir="ltr" className="text-xs">{t.phone}</bdi> },
          { h: "پلن", cell: (t) => <Badge tone="rose">{planName(t.plan)}</Badge> },
          { h: "وضعیت", cell: (t) => <Badge tone={tone[t.status]}>{t.status}</Badge> },
          { h: "پایان اشتراک", cell: (t) => t.expiry },
          { h: "کاربران / مشتریان", cell: (t) => `${fa(t.users)} / ${fa(t.customers)}` },
          { h: "کیف پول", cell: (t) => toman(t.wallet) },
          { h: "اقدام", cell: (t) => (
            <span className="flex flex-wrap gap-1.5">
              {t.status !== "فعال" && <Button variant="soft" onClick={() => setStatus(t.id, "فعال")}>فعال‌سازی</Button>}
              {t.status === "فعال" && <Button variant="ghost" onClick={() => setStatus(t.id, "تعلیق")}>تعلیق</Button>}
            </span>
          ) },
        ]} />
      </Card>
    </>
  );
}
