"use client";
import Link from "next/link";
import { AlertTriangle, PackageX, Warehouse as WIcon } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat, fieldCls, type Tone } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { actions, stockState, useDB, type StockState } from "@/lib/db";
import { fa, short } from "@/lib/fa";
import { useRouter } from "next/navigation";

const tone: Record<StockState, Tone> = { "کافی": "sage", "زیر نقطه سفارش": "amber", "ناموجود": "danger" };

export default function Warehouse() {
  const db = useDB();
  const router = useRouter();
  const low = db.products.filter((p) => stockState(p) !== "کافی");
  const value = db.products.reduce((a, p) => a + p.stock * p.cost, 0);
  const name = (id: string) => db.products.find((p) => p.id === id)?.name ?? id;

  const orderLow = () => {
    const lines = low.map((p) => ({ productId: p.id, qty: Math.max(p.reorderQty, p.reorder * 2 - p.stock), unitCost: p.cost }));
    const id = actions.createInvoice("پخش رز", lines, false);
    router.push(`/admin/purchases?draft=${encodeURIComponent(id)}`);
  };

  return (
    <>
      <PageTitle title="انبار" sub="موجودی هر کالا، نقطه سفارش و گردش ورود و خروج"
        actions={<><Link href="/admin/purchases" className="inline-flex items-center rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2">فاکتور خرید</Link><Button disabled={!low.length} onClick={orderLow}>سفارش کالاهای کم‌موجودی ({fa(low.length)})</Button></>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="تعداد اقلام" value={fa(db.products.length)} tone="rose" icon={<WIcon size={16} />} />
        <Stat label="زیر نقطه سفارش" value={fa(low.filter((p) => p.stock > 0).length)} tone="amber" icon={<AlertTriangle size={16} />} />
        <Stat label="ناموجود" value={fa(low.filter((p) => p.stock <= 0).length)} tone="danger" icon={<PackageX size={16} />} />
        <Stat label="ارزش انبار (به قیمت خرید)" value={short(value)} tone="gold" />
      </div>

      <Card className="mt-5">
        <CardHead title="موجودی کالاها" hint="نقطه سفارش و تعداد پیشنهادی را می‌توانید همین‌جا تغییر دهید" />
        <DataList rows={db.products} id={(p) => p.id} cols={[
          { h: "کالا", title: true, cell: (p) => <>{p.name} <span className="text-xs font-normal text-ink3">· {p.brand}</span></> },
          { h: "موجودی", cell: (p) => <b className={p.stock <= 0 ? "text-danger" : ""}>{fa(p.stock)}</b> },
          { h: "وضعیت", cell: (p) => <Badge tone={tone[stockState(p)]}>{stockState(p)}</Badge> },
          { h: "نقطه سفارش", cell: (p) => <input aria-label={`نقطه سفارش ${p.name}`} type="number" min={0} value={p.reorder} onChange={(e) => actions.setReorder(p.id, Math.max(0, +e.target.value || 0), p.reorderQty)} className={`${fieldCls} !w-20 !py-1.5 text-center`} /> },
          { h: "تعداد سفارش", cell: (p) => <input aria-label={`تعداد سفارش ${p.name}`} type="number" min={1} value={p.reorderQty} onChange={(e) => actions.setReorder(p.id, p.reorder, Math.max(1, +e.target.value || 1))} className={`${fieldCls} !w-20 !py-1.5 text-center`} /> },
          { h: "آخرین قیمت خرید", cell: (p) => short(p.cost) },
        ]} />
      </Card>

      <Card className="mt-5">
        <CardHead title="گردش انبار (آخرین‌ها)" />
        <ul className="divide-y divide-line">
          {db.moves.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="w-16 shrink-0 text-xs text-ink3">{m.date}</span>
              <span className="min-w-0 flex-1"><b className="block truncate">{name(m.productId)}</b><span className="text-xs text-ink3">{m.note}</span></span>
              <b className={m.delta > 0 ? "text-sage" : "text-danger"}>{m.delta > 0 ? "+" : "−"}{fa(Math.abs(m.delta))}</b>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
