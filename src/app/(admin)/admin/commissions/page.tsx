"use client";
import { useState } from "react";
import { Badge, Card, CardHead, PageTitle, Stat, type Tone } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { Chip, ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faDate, faNum, shortToman, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const CS: Record<string, { l: string; t: Tone }> = { WAITING: { l: "در انتظار مهلت مرجوعی", t: "amber" }, CREDITED: { l: "شارژ شد", t: "sage" }, VOID: { l: "لغو شد", t: "danger" } };

function Board() {
  const q = useQuery(() => crm.adminStoreOrders(), []);
  const [f, setF] = useState<string | undefined>(undefined);
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const rows = q.data.filter((o) => o.commissionStatus !== "NONE" && (!f || o.commissionStatus === f));
  const sum = (s: string) => q.data!.filter((o) => o.commissionStatus === s).reduce((a, o) => a + o.commission, 0);
  return (
    <>
      <PageTitle title="پورسانت سالن‌ها" sub="پورسانت سفارش‌های معرفی‌شده؛ ۷ روز پس از تحویل به کیف پول سالن می‌رود" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="در انتظار مهلت مرجوعی" value={shortToman(sum("WAITING"))} tone="amber" />
        <Stat label="شارژشده" value={shortToman(sum("CREDITED"))} tone="sage" />
        <Stat label="لغوشده" value={shortToman(sum("VOID"))} tone="rose" />
      </div>
      <div className="my-4 flex gap-2">{([[undefined, "همه"], ["WAITING", "در انتظار"], ["CREDITED", "شارژشده"], ["VOID", "لغوشده"]] as const).map(([k, l]) => <Chip key={l} active={f === k} onClick={() => setF(k)}>{l}</Chip>)}</div>
      <Card className="p-5">
        <CardHead title="سفارش‌های دارای پورسانت" />
        {!rows.length ? <p className="text-sm text-ink3">موردی نیست.</p> : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((o) => <li key={o.id} className="flex flex-wrap items-center gap-3 py-3"><span className="min-w-0 flex-1"><b>#{faNum(o.number)} · {o.salon ?? "—"}</b><span className="block text-xs text-ink3">{o.customerName} · {faDate.short(o.createdAt.slice(0, 10))} · سفارش {toman(o.total)}</span></span><b>{toman(o.commission)}</b><Badge tone={CS[o.commissionStatus].t}>{CS[o.commissionStatus].l}</Badge></li>)}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AdminCommissions() { return <AdminGate><Board /></AdminGate>; }
