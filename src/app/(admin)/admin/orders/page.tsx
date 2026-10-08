"use client";
import { useState } from "react";
import { Badge, Button, Card, CardHead, PageTitle, type Tone } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { Chip, ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm, type AdminStoreOrder } from "@/lib/crmApi";
import { faDate, faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const ST: Record<AdminStoreOrder["status"], { l: string; t: Tone }> = { PENDING_PAYMENT: { l: "منتظر پرداخت", t: "neutral" }, PAID: { l: "پرداخت‌شده", t: "sky" }, SHIPPED: { l: "ارسال‌شده", t: "amber" }, DELIVERED: { l: "تحویل‌شده", t: "sage" }, RETURNED: { l: "مرجوعی", t: "danger" }, CANCELED: { l: "لغو شد", t: "neutral" } };
const CS: Record<string, string> = { NONE: "—", WAITING: "در انتظار مهلت مرجوعی", CREDITED: "شارژ شد", VOID: "لغو شد" };

function Board() {
  const [f, setF] = useState<string | undefined>("PAID");
  const q = useQuery(() => crm.adminStoreOrders(f), [f]);
  const [err, setErr] = useState("");
  async function move(id: string, status: "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELED") { setErr(""); try { await crm.adminStoreOrderStatus(id, status); await q.reload(); } catch (e) { setErr(errorText(e)); } }
  return (
    <>
      <PageTitle title="سفارش‌های فروشگاه" sub="آماده‌سازی، ارسال، تحویل و مرجوعی؛ پورسانت سالن معرف ۷ روز پس از تحویل آزاد می‌شود" />
      <div className="mb-4 flex flex-wrap gap-2">{([[undefined, "همه"], ["PAID", "پرداخت‌شده"], ["SHIPPED", "ارسال‌شده"], ["DELIVERED", "تحویل‌شده"], ["RETURNED", "مرجوعی"], ["CANCELED", "لغوشده"]] as const).map(([k, l]) => <Chip key={l} active={f === k} onClick={() => setF(k)}>{l}</Chip>)}</div>
      {err && <ErrorNote message={err} />}
      <Card className="p-5">
        <CardHead title="سفارش‌ها" />
        {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <p className="text-sm text-ink3">سفارشی نیست.</p> : (
          <ul className="divide-y divide-line text-sm">
            {q.data.map((o) => (
              <li key={o.id} className="space-y-1.5 py-3">
                <div className="flex flex-wrap items-center gap-2"><b>#{faNum(o.number)} · {o.customerName}</b><bdi dir="ltr" className="text-xs text-ink3">{o.phone}</bdi><Badge tone={ST[o.status].t}>{ST[o.status].l}</Badge><span className="mr-auto text-xs text-ink3">{faDate.short(o.createdAt.slice(0, 10))}</span><b>{toman(o.total)}</b></div>
                <p className="text-xs text-ink2">{o.lines.map((l) => `${l.name} ×${faNum(l.qty)}`).join("، ")} · {o.city}، {o.address}</p>
                {o.salon && <p className="text-xs text-ink3">سالن معرف: {o.salon} · پورسانت {toman(o.commission)} ({CS[o.commissionStatus]})</p>}
                <div className="flex gap-2">
                  {o.status === "PAID" && <Button variant="soft" onClick={() => move(o.id, "SHIPPED")}>ارسال شد</Button>}
                  {o.status === "SHIPPED" && <Button variant="soft" onClick={() => move(o.id, "DELIVERED")}>تحویل شد</Button>}
                  {o.status === "DELIVERED" && <Button variant="ghost" className="!text-danger" onClick={() => confirm("این سفارش مرجوع شود؟ موجودی برمی‌گردد و پورسانت لغو می‌شود.") && move(o.id, "RETURNED")}>مرجوعی</Button>}
                  {(o.status === "PAID" || o.status === "SHIPPED") && <Button variant="ghost" className="!text-danger" onClick={() => confirm("سفارش لغو شود؟") && move(o.id, "CANCELED")}>لغو</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AdminOrders() { return <AdminGate><Board /></AdminGate>; }
