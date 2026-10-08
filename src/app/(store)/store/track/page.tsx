"use client";
import { useState } from "react";
import { Button, Card, fieldCls } from "@/components/ui";
import { errorText } from "@/lib/api";
import { store, type TrackedOrder } from "@/lib/storeApi";
import { digits } from "@/lib/validate";
import { faDate, faNum, toman } from "@/lib/fmt";

const ST: Record<string, string> = { PENDING_PAYMENT: "منتظر پرداخت", PAID: "پرداخت‌شده؛ در حال آماده‌سازی", SHIPPED: "ارسال شد", DELIVERED: "تحویل داده شد", RETURNED: "مرجوع شد", CANCELED: "لغو شد" };

export default function Track() {
  const [num, setNum] = useState(""); const [phone, setPhone] = useState("");
  const [o, setO] = useState<TrackedOrder | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() { setErr(""); setO(null); setBusy(true); try { setO(await store.track(Number(digits(num)), digits(phone).replace(/[\s-]/g, ""))); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-[22px] font-extrabold">پیگیری سفارش</h1>
      <Card className="space-y-3 p-5">
        <input value={num} onChange={(e) => setNum(e.target.value)} inputMode="numeric" placeholder="شماره‌ی سفارش" aria-label="شماره‌ی سفارش" className={fieldCls} dir="ltr" style={{ textAlign: "right" }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="موبایل ثبت‌شده در سفارش" aria-label="موبایل" className={fieldCls} dir="ltr" style={{ textAlign: "right" }} />
        {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <Button className="w-full" disabled={busy || !num || !phone} onClick={go}>پیگیری</Button>
      </Card>
      {o && (
        <Card className="space-y-2 p-5 text-sm">
          <p className="font-extrabold">سفارش #{faNum(o.number)} · {ST[o.status] ?? o.status}</p>
          <p className="text-xs text-ink3">{faDate.full(o.createdAt.slice(0, 10))} · {toman(o.total)}{o.shippingCost ? ` (با ارسال ${toman(o.shippingCost)})` : ""}</p>
          <ul className="text-ink2">{o.items.map((i) => <li key={i.name}>• {i.name} × {faNum(i.qty)}</li>)}</ul>
          {o.trackingCode && <p className="rounded-xl bg-sagesoft p-3 text-sage">کد رهگیری پست: <bdi dir="ltr" className="font-bold">{o.trackingCode}</bdi></p>}
        </Card>
      )}
    </div>
  );
}
