"use client";
import { Card, CardHead } from "@/components/ui";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { portal } from "@/lib/portalApi";
import { faDate, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

export default function Wallet() {
  const q = useQuery(portal.wallet, []);
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  return (
    <>
      <Card className="overflow-hidden"><div className="bg-[image:var(--grad-plum)] p-5 text-white"><p className="text-xs text-white/60">اعتبار کیف پول من</p><p className="mt-1 text-3xl font-extrabold">{toman(q.data.balance)}</p><p className="mt-1 text-xs text-white/65">در صندوق سالن به‌عنوان روش پرداخت قابل استفاده است.</p></div></Card>
      <Card>
        <CardHead title="تاریخچه" />
        <ul className="divide-y divide-line">
          {q.data.log.map((l) => <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="min-w-0 flex-1"><b className="block">{l.note || "تراکنش"}</b><span className="text-xs text-ink3">{faDate.short(l.createdAt.slice(0, 10))}</span></span><b className={l.wallet > 0 ? "text-sage" : "text-danger"}>{l.wallet > 0 ? "+" : "−"}{toman(Math.abs(l.wallet))}</b></li>)}
          {!q.data.log.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز تراکنشی نیست.</li>}
        </ul>
      </Card>
    </>
  );
}
