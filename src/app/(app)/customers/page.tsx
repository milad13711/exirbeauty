"use client";
import Link from "next/link";
import { useState } from "react";
import { FileUp, Plus, Search } from "lucide-react";
import { Avatar, Badge, Button, Card, LinkButton, PageTitle } from "@/components/ui";
import { LiveGate } from "@/components/live/LiveGate";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { crm, type CustomerRow } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faNum } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

function List() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [extra, setExtra] = useState<CustomerRow[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [more, setMore] = useState(false);
  const first = useQuery(() => crm.customers({ q: applied || undefined }), [applied]);
  const rows = [...(first.data?.items ?? []), ...extra];
  const next = cursor === undefined ? first.data?.nextCursor : cursor;

  async function loadMore() {
    if (!next) return;
    setMore(true);
    try { const r = await crm.customers({ q: applied || undefined, cursor: next }); setExtra((e) => [...e, ...r.items]); setCursor(r.nextCursor); } finally { setMore(false); }
  }
  const search = (v: string) => { setApplied(v.trim()); setExtra([]); setCursor(undefined); };

  return (
    <>
      <PageTitle title="مشتریان" sub={first.data?.total !== undefined && !applied ? `${faNum(first.data.total)} مشتری` : "جست‌وجو و مدیریت پرونده‌ی مشتری‌ها"}
        actions={<><LinkButton href="/customers/import" variant="ghost"><FileUp size={14} />ورود از فایل</LinkButton><LinkButton href="/customers/new"><Plus size={14} />مشتری جدید</LinkButton></>} />
      <form onSubmit={(e) => { e.preventDefault(); search(q); }} className="relative mb-4 block max-w-md">
        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" />
        <input value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) search(""); }} aria-label="جستجوی مشتری" placeholder="جستجوی نام یا شماره… (Enter)" className="w-full rounded-xl border border-line bg-surface py-2.5 pr-9 pl-3 text-sm outline-none focus:border-rose" />
      </form>
      {first.error && <ErrorNote message={errorText(first.error)} onRetry={first.reload} />}
      {first.loading && !first.data ? <Spinner /> : (
        <Card>
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/60">
                  <Avatar name={c.name} />
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm">{c.name}</b><bdi dir="ltr" className="text-xs text-ink3">{c.phone}</bdi></span>
                  <span className="flex flex-wrap justify-end gap-1">{c.tags.slice(0, 2).map((t) => <Badge key={t} tone="rose">{t}</Badge>)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!rows.length && !first.loading && <p className="py-10 text-center text-sm text-ink3">{applied ? "مشتری‌ای پیدا نشد." : "هنوز مشتری ثبت نشده است."} <Link href="/customers/new" className="font-bold text-rose">افزودن مشتری جدید</Link></p>}
        </Card>
      )}
      {next && <div className="mt-4 text-center"><Button variant="ghost" onClick={loadMore} disabled={more}>{more ? "در حال بارگذاری…" : "نمایش بیشتر"}</Button></div>}
    </>
  );
}

export default function Customers() {
  return <LiveGate><List /></LiveGate>;
}
