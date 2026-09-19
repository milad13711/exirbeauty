"use client";
import { useState } from "react";
import { Badge, Card, PageTitle } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { ordersSeed, salons } from "@/lib/mock3";
import { commTone, orderTone } from "@/lib/tones";
import { toman } from "@/lib/fa";

export default function Orders() {
  const [sid, setSid] = useState("all");
  const rows = ordersSeed.filter((o) => sid === "all" || o.salon === sid);
  const name = (id: string) => salons.find((s) => s.id === id)!.name;
  return (
    <>
      <PageTitle title="سفارش‌ها" sub="برای هر سفارش مشخص است مشتری از طرف کدام سالن (و کدام لینک) آمده است"
        actions={<select aria-label="سالن معرف" value={sid} onChange={(e) => setSid(e.target.value)} className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold"><option value="all">همه‌ی سالن‌ها</option>{salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>} />
      <Card>
        <DataList rows={rows} id={(o) => o.id} cols={[
          { h: "سفارش", title: true, cell: (o) => <>#{o.id} <span className="text-xs font-normal text-ink3">· {o.date}</span></> },
          { h: "مشتری", cell: (o) => <>{o.customer} <bdi dir="ltr" className="text-xs text-ink3">{o.phone}</bdi></> },
          { h: "اقلام", cell: (o) => o.items },
          { h: "مبلغ", cell: (o) => <b>{toman(o.total)}</b> },
          { h: "معرف", cell: (o) => <span><b className="text-rosedeep">{name(o.salon)}</b><span className="block text-xs text-ink3">{o.via}</span></span> },
          { h: "وضعیت", cell: (o) => <Badge tone={orderTone[o.status]}>{o.status}</Badge> },
          { h: "پورسانت", cell: (o) => <span className="inline-flex flex-col items-end gap-1 md:items-start"><b>{toman(o.comm)}</b><Badge tone={commTone[o.cs]}>{o.cs}</Badge></span> },
        ]} />
      </Card>
    </>
  );
}
