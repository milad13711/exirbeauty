"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, PackageCheck, RotateCcw, Truck, Undo2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { actions, useDB } from "@/lib/db";
import { salons } from "@/lib/mock3";
import { commTone, orderTone } from "@/lib/tones";
import { fa, toman } from "@/lib/fa";

const reasons = ["مشتری منصرف شد", "کالا آسیب‌دیده رسید", "کالای اشتباه ارسال شد", "مغایرت با توضیحات", "سایر"];

export function OrderDetail({ id }: { id: string }) {
  const db = useDB();
  const o = db.orders.find((x) => x.id === id);
  const [tracking, setTracking] = useState("");
  const [reason, setReason] = useState(reasons[0]);
  const [confirm, setConfirm] = useState(false);
  if (!o) return <div className="py-20 text-center text-ink2">سفارش پیدا نشد. <Link href="/admin/orders" className="font-bold text-rose">بازگشت</Link></div>;

  const salon = salons.find((s) => s.id === o.salon);
  const canCancel = o.status === "پرداخت‌شده";
  const canReturn = o.status === "ارسال‌شده" || o.status === "تحویل‌شده";
  const chargedAlready = o.cs === "شارژ شد";

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />همه‌ی سفارش‌ها</Link>
      <PageTitle title={`سفارش #${o.id}`} sub={`${o.date} · ${o.customer}`} actions={<Badge tone={orderTone[o.status]} className="!px-3 !py-1 !text-xs">{o.status}</Badge>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card>
            <CardHead title="اقلام" />
            <ul className="divide-y divide-line">
              {o.lines.map((l) => <li key={l.productId} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1 font-semibold">{l.name}</span><span className="text-ink3">{fa(l.qty)} × {toman(l.price)}</span></li>)}
              <li className="flex justify-between px-5 py-3 text-sm font-extrabold"><span>جمع</span><span>{toman(o.total)}</span></li>
            </ul>
          </Card>
          <Card>
            <CardHead title="تاریخچه‌ی سفارش" />
            <ol className="space-y-2 px-5 pb-5 text-sm">
              {o.log.map((l, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-rose" />{l}</li>)}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="مشتری و معرف" />
            <dl className="divide-y divide-line px-5 pb-3 text-sm">
              {[["نام", o.customer], ["موبایل", o.phone], ["آدرس", o.address ?? "—"], ["معرف", salon?.name ?? "مستقیم"], ["مسیر", o.via]].map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-ink3">{k}</dt><dd className="text-left font-medium">{v}</dd></div>)}
              {o.tracking && <div className="flex justify-between gap-3 py-2"><dt className="text-ink3">کد رهگیری</dt><dd><bdi dir="ltr">{o.tracking}</bdi></dd></div>}
            </dl>
          </Card>
          <Card>
            <CardHead title="پورسانت" />
            <div className="space-y-2 px-5 pb-5 text-sm">
              <p className="text-2xl font-extrabold">{toman(o.comm)}</p>
              <Badge tone={commTone[o.cs]}>{o.cs}</Badge>
              {o.cs === "در انتظار مهلت مرجوعی" && <div className="pt-2"><Button variant="soft" onClick={() => actions.endReturnWindow(o.id)}>پایان مهلت مرجوعی (شبیه‌سازی ۷ روز)</Button></div>}
              {o.cs === "آماده شارژ" && <div className="pt-2"><Button onClick={() => actions.chargeCommissions([o.id])}>شارژ کیف پول {salon?.name}</Button></div>}
            </div>
          </Card>

          <Card>
            <CardHead title="اقدام" />
            <div className="space-y-3 px-5 pb-5">
              {o.status === "پرداخت‌شده" && (
                <div className="space-y-2">
                  <Field label="کد رهگیری پست"><input value={tracking} onChange={(e) => setTracking(e.target.value)} dir="ltr" placeholder="مثلاً 2400123456789" className={fieldCls} /></Field>
                  <Button disabled={tracking.trim().length < 6} onClick={() => actions.shipOrder(o.id, tracking.trim())}><Truck size={14} />ثبت ارسال</Button>
                </div>
              )}
              {o.status === "ارسال‌شده" && <Button onClick={() => actions.deliverOrder(o.id)}><PackageCheck size={14} />تحویل به مشتری شد</Button>}
              {(canCancel || canReturn) && (
                <div className="space-y-2 border-t border-line pt-3">
                  <Field label={canCancel ? "دلیل لغو" : "دلیل مرجوعی"}><select value={reason} onChange={(e) => setReason(e.target.value)} className={fieldCls}>{reasons.map((r) => <option key={r}>{r}</option>)}</select></Field>
                  {confirm ? (
                    <div className="space-y-2 rounded-xl bg-dangersoft p-3 text-xs leading-6 text-danger">
                      <p>موجودی کالاها به انبار برمی‌گردد و پورسانت لغو می‌شود{chargedAlready ? `؛ چون پورسانت قبلاً شارژ شده، ${toman(o.comm)} از کیف پول ${salon?.name} کسر می‌شود` : ""}.</p>
                      <div className="flex gap-2"><Button className="!bg-danger" onClick={() => { actions.returnOrder(o.id, reason, canCancel ? "لغو" : "مرجوعی"); setConfirm(false); }}>تأیید {canCancel ? "لغو" : "مرجوعی"}</Button><Button variant="ghost" onClick={() => setConfirm(false)}>انصراف</Button></div>
                    </div>
                  ) : <Button variant="ghost" className="!text-danger" onClick={() => setConfirm(true)}>{canCancel ? <><Undo2 size={14} />لغو سفارش</> : <><RotateCcw size={14} />ثبت مرجوعی</>}</Button>}
                </div>
              )}
              {o.status === "مرجوعی" && <p className="text-sm text-ink2">این سفارش {o.reason ? `(${o.reason}) ` : ""}مرجوع/لغو شده است.</p>}
              {o.status === "تحویل‌شده" && !canReturn && null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
