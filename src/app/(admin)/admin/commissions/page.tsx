"use client";
import Link from "next/link";
import { CheckCircle2, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { actions, useDB } from "@/lib/db";
import { CRM_PLAN, RETURN_DAYS, salons } from "@/lib/mock3";
import { commTone } from "@/lib/tones";
import { fa, short, toman } from "@/lib/fa";

export default function Commissions() {
  const db = useDB();
  const orders = db.orders.filter((o) => o.salon);
  const name = (id: string | null) => salons.find((s) => s.id === id)?.name ?? "—";
  const ready = orders.filter((o) => o.cs === "آماده شارژ");
  const sum = (cs: string) => orders.filter((o) => o.cs === cs).reduce((a, o) => a + o.comm, 0);
  const walletTotal = salons.reduce((a, s) => a + (db.wallets[s.id] ?? 0), 0);

  return (
    <>
      <PageTitle title="پورسانت‌ها و کیف پول سالن‌ها" sub={`پورسانت پس از تحویل و گذشتن ${fa(RETURN_DAYS)} روز مهلت مرجوعی قابل شارژ است`}
        actions={<Button disabled={!ready.length} onClick={() => actions.chargeCommissions(ready.map((o) => o.id))}><Wallet size={14} />شارژ همه‌ی آماده‌ها ({fa(ready.length)})</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="در انتظار تحویل یا مهلت" value={short(sum("در انتظار تحویل") + sum("در انتظار مهلت مرجوعی"))} tone="amber" />
        <Stat label="آماده‌ی شارژ" value={short(sum("آماده شارژ"))} tone="sky" />
        <Stat label="شارژ‌شده" value={short(sum("شارژ شد"))} tone="sage" />
        <Stat label="مجموع کیف پول‌ها" value={short(walletTotal)} tone="rose" />
      </div>

      <Card className="mt-5">
        <CardHead title="پورسانت هر سفارش" hint="برای مرجوعی و تغییر وضعیت وارد جزئیات سفارش شوید" />
        <DataList rows={orders} id={(o) => o.id} cols={[
          { h: "سفارش", title: true, cell: (o) => <Link href={`/admin/orders/${encodeURIComponent(o.id)}`} className="text-rosedeep hover:underline">#{o.id} <span className="text-xs font-normal text-ink3">· {o.lines[0]?.name}{o.lines.length > 1 ? " و …" : ""}</span></Link> },
          { h: "سالن معرف", cell: (o) => <b className="text-rosedeep">{name(o.salon)}</b> },
          { h: "مبلغ سفارش", cell: (o) => toman(o.total) },
          { h: "پورسانت", cell: (o) => <b>{toman(o.comm)}</b> },
          { h: "وضعیت", cell: (o) => <Badge tone={commTone[o.cs]}>{o.cs}</Badge> },
          { h: "اقدام", cell: (o) => o.cs === "آماده شارژ" ? <Button variant="soft" onClick={() => actions.chargeCommissions([o.id])}>شارژ کیف پول</Button> : o.cs === "در انتظار مهلت مرجوعی" ? <Button variant="ghost" onClick={() => actions.endReturnWindow(o.id)}>پایان مهلت</Button> : o.cs === "شارژ شد" ? <CheckCircle2 size={18} className="text-sage" aria-label="شارژ شد" /> : <span className="text-ink3">—</span> },
        ]} />
      </Card>

      <Card className="mt-5">
        <CardHead title="تمدید اشتراک از کیف پول" hint={`سررسید بعدی ${CRM_PLAN.renewal} · مبلغ ${toman(CRM_PLAN.price)}`} />
        <ul className="divide-y divide-line">
          {salons.map((s) => {
            const w = db.wallets[s.id] ?? 0;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
                <b className="min-w-0 flex-1 basis-32">{s.name}</b>
                <span className="text-ink2">کیف پول: {toman(w)}</span>
                {w >= CRM_PLAN.price ? <Badge tone="sage">اشتراک کامل از کیف پول کسر می‌شود</Badge> : <Badge tone="amber">{toman(CRM_PLAN.price - w)} با پرداخت آنلاین</Badge>}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
