"use client";
import { Card, CardHead, PageTitle } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

function Board() {
  const q = useQuery(crm.adminReferrers, []);
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  return (
    <>
      <PageTitle title="سالن‌های معرف" sub="سالن‌هایی که از لینک فروشگاهشان سفارش آمده؛ پورسانت و موجودی کیف پول هر سالن" />
      <Card className="p-5">
        <CardHead title="سالن‌ها" />
        {!q.data.length ? <p className="text-sm text-ink3">هنوز سفارشی از لینک سالنی ثبت نشده است.</p> : (
          <ul className="divide-y divide-line text-sm">
            {q.data.map((s) => <li key={s.tenantId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"><span className="min-w-0 flex-1"><b>{s.name}</b><span className="block text-xs text-ink3">{s.city} · {faNum(s.orders)} سفارش · فروش {toman(s.sales)}</span></span><span className="text-xs text-ink2">شارژشده {toman(s.credited)}</span><span className="text-xs text-amber">در انتظار {toman(s.pending)}</span><b>کیف پول {toman(s.wallet)}</b></li>)}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AdminReferrers() { return <AdminGate><Board /></AdminGate>; }
