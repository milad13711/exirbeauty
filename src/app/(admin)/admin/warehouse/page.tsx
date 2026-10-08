"use client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faNum, shortToman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const LOW = 5;

function Board() {
  const q = useQuery(crm.adminStoreProducts, []);
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const low = q.data.filter((p) => p.stock <= LOW);
  const value = q.data.reduce((a, p) => a + p.stock * p.price, 0);
  return (
    <>
      <PageTitle title="انبار فروشگاه" sub="موجودی هر کالا؛ ورود کالا از «فاکتورهای خرید» ثبت می‌شود و فروش و مرجوعی خودکار موجودی را تغییر می‌دهند" />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="اقلام" value={faNum(q.data.length)} tone="rose" />
        <Stat label={`کم‌موجود (≤ ${faNum(LOW)})`} value={faNum(low.length)} tone="amber" icon={<AlertTriangle size={16} />} />
        <Stat label="ارزش موجودی (قیمت فروش)" value={shortToman(value)} tone="gold" />
      </div>
      <Card className="mt-5 p-5">
        <CardHead title="موجودی" action={<Link href="/admin/purchases" className="text-[13px] font-semibold text-rose">ثبت ورود کالا ←</Link>} />
        <ul className="divide-y divide-line text-sm">
          {q.data.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-3 py-3"><span className="min-w-0 flex-1"><b>{p.name}</b><span className="block text-xs text-ink3">{p.brand} · {p.category}</span></span><b className={p.stock <= LOW ? "text-danger" : ""}>{faNum(p.stock)}</b>{p.stock <= 0 ? <Badge tone="danger">ناموجود</Badge> : p.stock <= LOW ? <Badge tone="amber">سفارش بده</Badge> : <Badge tone="sage">کافی</Badge>}{!p.active && <Badge>پنهان</Badge>}</li>)}
        </ul>
      </Card>
    </>
  );
}

export default function AdminWarehouse() { return <AdminGate><Board /></AdminGate>; }
