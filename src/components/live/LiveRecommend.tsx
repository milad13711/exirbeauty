"use client";
import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Badge, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { LiveGate } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faNum, shortToman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

function Board() {
  const [q, setQ] = useState(""); const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  const found = useQuery(() => (q.trim().length >= 2 && !pick ? crm.customers({ q: q.trim(), limit: 6 }) : Promise.resolve(null)), [q, pick]);
  const rec = useQuery(() => (pick ? crm.shopRecommend(pick.id) : Promise.resolve(null)), [pick?.id]);
  return (
    <div className="space-y-5">
      <PageTitle title="توصیه‌ی هوشمند محصول" sub="بر اساس آخرین خدمت مشتری، محصول مراقبتی مناسب از فروشگاه اکسیر پیشنهاد می‌شود" />
      <Card className="space-y-3 p-5">
        <CardHead title="مشتری را انتخاب کنید" hint="دسته‌ی آخرین خدمت او تعیین می‌کند چه محصولی پیشنهاد شود (مو ← مراقبت مو، پوست ← مراقبت پوست، …)" />
        {pick ? <p className="flex items-center justify-between rounded-xl bg-surface2 p-3 text-sm"><b>{pick.name}</b><button className="cursor-pointer text-xs font-bold text-rose" onClick={() => setPick(null)}>تغییر</button></p> : (
          <>
            <Field label="جست‌وجوی مشتری"><input className={fieldCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره…" /></Field>
            {found.data && <div className="flex flex-wrap gap-2">{found.data.items.map((c) => <Chip key={c.id} active={false} onClick={() => setPick({ id: c.id, name: c.name })}>{c.name}</Chip>)}</div>}
          </>
        )}
      </Card>
      {pick && (
        <Card className="p-5">
          <CardHead title="پیشنهادها" action={<Wand2 size={16} className="text-rose" />} hint={rec.data?.basedOn ? `بر اساس آخرین خدمت: ${rec.data.basedOn}` : "این مشتری هنوز خدمتی ثبت‌شده ندارد؛ پیشنهادهای عمومی نمایش داده می‌شود"} />
          {rec.loading && !rec.data ? <Spinner /> : rec.error && !rec.data ? <ErrorNote message={errorText(rec.error)} /> : !rec.data?.products.length ? <p className="text-sm text-ink3">فعلاً محصول موجودی برای پیشنهاد نیست.</p> : (
            <ul className="divide-y divide-line text-sm">
              {rec.data.products.map((p) => <li key={p.id} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="text-xs text-ink3">{p.brand} · {p.category}</span></span><b>{shortToman(p.price)}</b><Badge tone="gold">{faNum(p.commissionPct)}٪ پورسانت</Badge></li>)}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink3">لینک فروشگاه سالن را از صفحه‌ی «فروشگاه آنلاین» برای مشتری بفرستید تا پورسانت به نام شما ثبت شود.</p>
        </Card>
      )}
    </div>
  );
}

export function LiveRecommend() { return <LiveGate><Board /></LiveGate>; }
