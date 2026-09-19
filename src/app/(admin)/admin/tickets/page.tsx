"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Badge, Card, CardHead, PageTitle, Stat, fieldCls } from "@/components/ui";
import { StatusBadge, TicketThread } from "@/components/TicketThread";
import { useDB, type Ticket } from "@/lib/db";
import { ops } from "@/lib/ops";
import { fa } from "@/lib/fa";

const filters = ["همه", "باز", "در حال بررسی", "بسته"] as const;

export default function AdminTickets() {
  const db = useDB();
  const [f, setF] = useState<(typeof filters)[number]>("همه");
  const [sel, setSel] = useState<string | null>(null);
  const list = db.tickets.filter((t) => f === "همه" || t.status === f).sort((a, b) => Number(b.priority === "فوری") - Number(a.priority === "فوری") || b.day - a.day);
  const cur = db.tickets.find((t) => t.id === sel) ?? list[0];
  const tenant = (id: string) => db.tenants.find((t) => t.id === id);
  const me = db.session?.role === "admin" ? db.session.name : "پشتیبان";

  return (
    <>
      <PageTitle title="تیکت‌های پشتیبانی" sub="پیام‌های سالن‌ها؛ فوری‌ها بالاتر نمایش داده می‌شوند" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="باز" value={fa(db.tickets.filter((t) => t.status === "باز").length)} tone="amber" />
        <Stat label="در حال بررسی" value={fa(db.tickets.filter((t) => t.status === "در حال بررسی").length)} tone="sky" />
        <Stat label="فوری باز" value={fa(db.tickets.filter((t) => t.priority === "فوری" && t.status !== "بسته").length)} tone="danger" />
        <Stat label="بسته‌شده" value={fa(db.tickets.filter((t) => t.status === "بسته").length)} tone="sage" />
      </div>
      <div className="my-5 flex flex-wrap gap-2" role="tablist">{filters.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", f === x ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2")}>{x}</button>)}</div>
      <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
        <Card>
          <ul className="divide-y divide-line">
            {list.map((t) => <li key={t.id}><button onClick={() => setSel(t.id)} className={clsx("flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-right", cur?.id === t.id ? "bg-rosesoft" : "hover:bg-surface2")}><span className="min-w-0 flex-1"><b className="block truncate text-sm">{t.subject}</b><span className="text-xs text-ink3">{tenant(t.tenantId)?.name} · {t.category}</span></span>{t.priority === "فوری" && <Badge tone="danger">فوری</Badge>}<StatusBadge s={t.status} /></button></li>)}
            {!list.length && <li className="px-5 py-10 text-center text-sm text-ink3">تیکتی با این فیلتر وجود ندارد.</li>}
          </ul>
        </Card>
        {cur ? (
          <Card>
            <CardHead title={cur.subject} hint={`${cur.id} · ${cur.category}`} action={<Link href={`/admin/tenants/${cur.tenantId}`} className="text-[13px] font-semibold text-rose">{tenant(cur.tenantId)?.name} ←</Link>} />
            <div className="space-y-4 px-5 pb-5">
              <div className="flex flex-wrap gap-2">
                <select aria-label="وضعیت" value={cur.status} onChange={(e) => ops.setTicket(cur.id, { status: e.target.value as Ticket["status"] })} className={`${fieldCls} !w-auto !py-1.5`}>{(["باز", "در حال بررسی", "بسته"] as const).map((s) => <option key={s}>{s}</option>)}</select>
                <select aria-label="اولویت" value={cur.priority} onChange={(e) => ops.setTicket(cur.id, { priority: e.target.value as Ticket["priority"] })} className={`${fieldCls} !w-auto !py-1.5`}><option>عادی</option><option>فوری</option></select>
              </div>
              <TicketThread t={cur} as="admin" name={me} />
            </div>
          </Card>
        ) : <Card className="grid place-items-center p-10 text-sm text-ink3">تیکتی انتخاب نشده است.</Card>}
      </div>
    </>
  );
}
