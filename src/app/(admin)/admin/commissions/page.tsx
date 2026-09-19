"use client";
import { useState } from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { CRM_PLAN, RETURN_DAYS, ordersSeed, salons as seedSalons } from "@/lib/mock3";
import { fa, short, toman } from "@/lib/fa";
import { commTone } from "@/lib/tones";

export default function Commissions() {
  const [orders, setOrders] = useState(ordersSeed);
  const [salons, setSalons] = useState(seedSalons);
  const name = (id: string) => salons.find((s) => s.id === id)!.name;

  const charge = (ids: string[]) => {
    const hit = orders.filter((o) => ids.includes(o.id) && o.cs === "آماده شارژ");
    setSalons((ss) => ss.map((s) => ({ ...s, wallet: s.wallet + hit.filter((o) => o.salon === s.id).reduce((a, o) => a + o.comm, 0) })));
    setOrders((os) => os.map((o) => (hit.some((h) => h.id === o.id) ? { ...o, cs: "شارژ شد" } : o)));
  };
  const ready = orders.filter((o) => o.cs === "آماده شارژ");
  const waiting = orders.filter((o) => o.cs === "در انتظار مهلت مرجوعی").reduce((a, o) => a + o.comm, 0);
  const done = orders.filter((o) => o.cs === "شارژ شد").reduce((a, o) => a + o.comm, 0);

  return (
    <>
      <PageTitle title="پورسانت‌ها و کیف پول سالن‌ها" sub={`پورسانت ${fa(RETURN_DAYS)} روز پس از تحویل (پایان مهلت مرجوعی) قابل شارژ است`}
        actions={<Button disabled={!ready.length} onClick={() => charge(ready.map((o) => o.id))}><Wallet size={14} />شارژ همه‌ی آماده‌ها ({fa(ready.length)})</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="در انتظار مهلت مرجوعی" value={short(waiting)} tone="amber" />
        <Stat label="آماده‌ی شارژ" value={short(ready.reduce((a, o) => a + o.comm, 0))} tone="sky" />
        <Stat label="شارژ‌شده" value={short(done)} tone="sage" />
        <Stat label="مجموع کیف پول‌ها" value={short(salons.reduce((a, s) => a + s.wallet, 0))} tone="rose" />
      </div>

      <Card className="mt-5">
        <CardHead title="ثبت پورسانت هر سفارش" />
        <DataList rows={orders} id={(o) => o.id} cols={[
          { h: "سفارش", title: true, cell: (o) => <>#{o.id} <span className="text-xs font-normal text-ink3">· {o.items}</span></> },
          { h: "سالن معرف", cell: (o) => <b className="text-rosedeep">{name(o.salon)}</b> },
          { h: "مبلغ سفارش", cell: (o) => toman(o.total) },
          { h: "پورسانت", cell: (o) => <b>{toman(o.comm)}</b> },
          { h: "وضعیت", cell: (o) => <Badge tone={commTone[o.cs]}>{o.cs}</Badge> },
          { h: "اقدام", cell: (o) => o.cs === "آماده شارژ" ? <Button variant="soft" onClick={() => charge([o.id])}>شارژ کیف پول</Button> : o.cs === "شارژ شد" ? <CheckCircle2 size={18} className="text-sage" aria-label="شارژ شد" /> : <span className="text-ink3">—</span> },
        ]} />
      </Card>

      <Card className="mt-5">
        <CardHead title="تمدید اشتراک از کیف پول" hint={`سررسید بعدی ${CRM_PLAN.renewal} · مبلغ ${toman(CRM_PLAN.price)}`} />
        <ul className="divide-y divide-line">
          {salons.map((s) => {
            const full = s.wallet >= CRM_PLAN.price;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm">
                <b className="min-w-0 flex-1 basis-32">{s.name}</b>
                <span className="text-ink2">کیف پول: {toman(s.wallet)}</span>
                {full ? <Badge tone="sage">اشتراک کامل از کیف پول کسر می‌شود</Badge> : <Badge tone="amber">{toman(CRM_PLAN.price - s.wallet)} با پرداخت آنلاین</Badge>}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
