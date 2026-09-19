"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Card, PageTitle } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { useDB } from "@/lib/db";
import { salons } from "@/lib/mock3";
import { commTone, orderTone } from "@/lib/tones";
import { fa, toman } from "@/lib/fa";

const statuses = ["همه", "پرداخت‌شده", "ارسال‌شده", "تحویل‌شده", "مرجوعی"] as const;

export default function Orders() {
  const db = useDB();
  const [sid, setSid] = useState("all");
  const [st, setSt] = useState<(typeof statuses)[number]>("همه");
  const rows = db.orders.filter((o) => (sid === "all" || o.salon === sid) && (st === "همه" || o.status === st));
  const name = (id: string | null) => (id ? salons.find((s) => s.id === id)?.name ?? id : "مستقیم (بدون معرف)");
  return (
    <>
      <PageTitle title="سفارش‌ها" sub="روی هر سفارش بزنید تا وضعیت، ارسال، تحویل و مرجوعی را مدیریت کنید"
        actions={<>
          <select aria-label="وضعیت" value={st} onChange={(e) => setSt(e.target.value as typeof st)} className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold">{statuses.map((x) => <option key={x}>{x}</option>)}</select>
          <select aria-label="سالن معرف" value={sid} onChange={(e) => setSid(e.target.value)} className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold"><option value="all">همه‌ی معرف‌ها</option>{salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </>} />
      <Card>
        <DataList rows={rows} id={(o) => o.id} cols={[
          { h: "سفارش", title: true, cell: (o) => <Link href={`/admin/orders/${encodeURIComponent(o.id)}`} className="text-rosedeep hover:underline">#{o.id} <span className="text-xs font-normal text-ink3">· {o.date}</span></Link> },
          { h: "مشتری", cell: (o) => <>{o.customer} <bdi dir="ltr" className="text-xs text-ink3">{o.phone}</bdi></> },
          { h: "اقلام", cell: (o) => o.lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${fa(l.qty)}` : ""}`).join("، ") },
          { h: "مبلغ", cell: (o) => <b>{toman(o.total)}</b> },
          { h: "معرف", cell: (o) => <span><b className="text-rosedeep">{name(o.salon)}</b><span className="block text-xs text-ink3">{o.via}</span></span> },
          { h: "وضعیت", cell: (o) => <Badge tone={orderTone[o.status]}>{o.status}</Badge> },
          { h: "پورسانت", cell: (o) => <span className="inline-flex flex-col items-end gap-1 md:items-start"><b>{toman(o.comm)}</b><Badge tone={commTone[o.cs]}>{o.cs}</Badge></span> },
        ]} />
      </Card>
      {!rows.length && <p className="py-10 text-center text-sm text-ink3">سفارشی با این فیلتر وجود ندارد.</p>}
    </>
  );
}
