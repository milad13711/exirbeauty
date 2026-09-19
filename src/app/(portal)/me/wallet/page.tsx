"use client";
import { useState } from "react";
import clsx from "clsx";
import { Gift } from "lucide-react";
import { Button, Card, CardHead, fieldCls } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { portal } from "@/lib/portal";
import { num, toman } from "@/lib/fa";

export default function MyWallet() {
  const me = useMe();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  if (!me) return null;
  return (
    <>
      <Card className="bg-sagesoft p-5"><p className="text-xs text-sage">اعتبار کیف پول</p><p className="mt-1 text-3xl font-extrabold text-sage">{toman(me.wallet)}</p><p className="mt-1 text-xs text-ink2">در مراجعه‌ی بعدی هنگام پرداخت خرج می‌شود.</p></Card>

      <Card>
        <CardHead title="کارت هدیه دارید؟" action={<Gift size={16} className="text-rose" />} />
        <form onSubmit={(e) => { e.preventDefault(); const r = portal.redeemGift(me.id, code); setMsg({ ok: r.ok, t: r.msg }); if (r.ok) setCode(""); }} className="space-y-3 px-5 pb-5">
          <input aria-label="کد کارت هدیه" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GC-0000-0000" dir="ltr" className={fieldCls} />
          <Button type="submit" disabled={!code.trim()} className="w-full">افزودن به کیف پول</Button>
          {msg && <p role="status" className={clsx("rounded-xl p-2.5 text-xs", msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{msg.t}</p>}
        </form>
      </Card>

      <Card>
        <CardHead title="تراکنش‌ها" />
        <ul className="divide-y divide-line">
          {me.walletLog.map((w, i) => <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1"><b className="block">{w.note}</b><span className="text-xs text-ink3">{w.d}</span></span><b className={w.delta > 0 ? "text-sage" : "text-danger"}>{w.delta > 0 ? "+" : "−"}{num(Math.abs(w.delta))}</b></li>)}
          {!me.walletLog.length && <li className="px-5 pb-6 text-center text-sm text-ink3">تراکنشی ثبت نشده است.</li>}
        </ul>
      </Card>
    </>
  );
}
