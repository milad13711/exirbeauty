"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Badge, Button, Card, PageTitle, Stat } from "@/components/ui";
import { tenantTone } from "@/lib/tones";
import { DataList } from "@/components/DataList";
import { useDB, type TStatus } from "@/lib/db";
import { ops } from "@/lib/ops";
import { plans } from "@/lib/mock4";
import { fa, short, toman } from "@/lib/fa";

const filters = ["همه", "فعال", "آزمایشی", "منقضی‌شده", "تعلیق"] as const;
const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

export default function Tenants() {
  const db = useDB();
  const [f, setF] = useState<(typeof filters)[number]>("همه");
  const list = db.tenants.filter((t) => f === "همه" || t.status === f);
  const mrr = db.tenants.filter((t) => t.status === "فعال").reduce((a, t) => a + (plans.find((p) => p.id === t.plan)?.price ?? 0), 0);
  const setStatus = (id: string, status: TStatus) => { const t = db.tenants.find((x) => x.id === id); if (t) ops.saveTenant({ ...t, status }); };

  return (
    <>
      <PageTitle title="تننت‌ها (سالن‌های مشتری CRM)" sub="سالن‌هایی که اشتراک اکسیر بیوتی را خریده‌اند؛ روی نام هر سالن بزنید تا جزئیات را ببینید" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="کل تننت‌ها" value={fa(db.tenants.length)} tone="rose" />
        <Stat label="فعال" value={fa(db.tenants.filter((t) => t.status === "فعال").length)} tone="sage" />
        <Stat label="آزمایشی / منقضی" value={`${fa(db.tenants.filter((t) => t.status === "آزمایشی").length)} / ${fa(db.tenants.filter((t) => t.status === "منقضی‌شده").length)}`} tone="amber" />
        <Stat label="درآمد ماهانه (MRR)" value={short(mrr)} tone="gold" />
      </div>
      <div className="my-5 flex flex-wrap gap-2" role="tablist">
        {filters.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", f === x ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2")}>{x}</button>)}
      </div>
      <Card>
        <DataList rows={list} id={(t) => t.id} cols={[
          { h: "سالن", title: true, cell: (t) => <Link href={`/admin/tenants/${t.id}`} className="text-rosedeep hover:underline">{t.name} <span className="text-xs font-normal text-ink3">· {t.city} · {t.owner}</span></Link> },
          { h: "تلفن", cell: (t) => <bdi dir="ltr" className="text-xs">{t.phone}</bdi> },
          { h: "پلن", cell: (t) => <Badge tone="rose">{planName(t.plan)}</Badge> },
          { h: "وضعیت", cell: (t) => <Badge tone={tenantTone[t.status]}>{t.status}</Badge> },
          { h: "پایان اشتراک", cell: (t) => t.expiry },
          { h: "کاربران / مشتریان", cell: (t) => `${fa(t.users)} / ${fa(t.customers)}` },
          { h: "کیف پول", cell: (t) => toman(t.wallet) },
          { h: "اقدام", cell: (t) => <span className="flex flex-wrap gap-1.5">{t.status !== "فعال" && <Button variant="soft" onClick={() => setStatus(t.id, "فعال")}>فعال‌سازی</Button>}{t.status === "فعال" && <Button variant="ghost" onClick={() => setStatus(t.id, "تعلیق")}>تعلیق</Button>}</span> },
        ]} />
      </Card>
    </>
  );
}
