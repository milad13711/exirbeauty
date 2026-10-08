"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui";

type Status = { status: "PENDING" | "PAID" | "FAILED" | "CANCELED"; kind: "PLAN" | "ADDON" | "LISTING_PLAN" | "SMS_TOPUP" | "COURSE" | "STORE_ORDER"; amount: number; refId: string | null; description: string; failReason: string | null };

function Result() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/payments/${encodeURIComponent(id)}/status`).then((r) => r.json()).then((j) => (j.data ? setS(j.data) : setErr(true))).catch(() => setErr(true));
  }, [id]);

  const paid = s?.status === "PAID";
  // A paid store order empties the shopper's cart (the cart lives in this browser).
  useEffect(() => { if (paid && s?.kind === "STORE_ORDER") { try { localStorage.removeItem("exir_cart"); } catch {} } }, [paid, s?.kind]);
  const canceled = s?.status === "CANCELED" || sp.get("r") === "canceled";
  return (
    <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4">
      <Card className="w-full p-7 text-center">
        <span className={`mx-auto grid size-14 place-items-center rounded-full ${paid ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{paid ? <CheckCircle2 size={28} /> : <XCircle size={28} />}</span>
        <h1 className="mt-4 text-xl font-extrabold text-ink">{paid ? "پرداخت موفق بود" : canceled ? "پرداخت لغو شد" : s || err ? "پرداخت ناموفق بود" : "در حال بررسی…"}</h1>
        {s && <p className="mt-2 text-sm leading-7 text-ink2">{s.description}<br />مبلغ: {s.amount.toLocaleString("fa-IR")} تومان{s.refId && <><br />کد پیگیری: <bdi dir="ltr">{s.refId}</bdi></>}</p>}
        {s?.failReason === "APPLY_FAILED" && <p className="mt-3 rounded-xl bg-ambersoft p-2.5 text-xs text-amber">پرداخت ثبت شد ولی فعال‌سازی به پشتیبانی ارجاع شد؛ تا دقایقی دیگر فعال می‌شود.</p>}
        {!paid && s && <p className="mt-3 text-xs text-ink3">اگر مبلغی از حساب شما کسر شده باشد، تا ۷۲ ساعت به حساب بازمی‌گردد.</p>}
        {paid && s?.kind === "LISTING_PLAN" && <p className="mt-3 rounded-xl bg-sagesoft p-3 text-sm leading-7 text-sage">پنل مدیریت شما فعال شد. با همان شماره‌ی موبایلِ ثبت‌نام و کد پیامکی وارد شوید.</p>}
        {paid && s?.kind === "STORE_ORDER" && <p className="mt-3 rounded-xl bg-sagesoft p-3 text-sm leading-7 text-sage">سفارش شما ثبت شد و برای ارسال آماده می‌شود.</p>}
        {s?.kind === "STORE_ORDER" ? (
          <Link href="/store" className="press mt-5 inline-block rounded-[14px] bg-[image:var(--grad-rose)] px-5 py-2.5 text-[13.5px] font-bold text-white">بازگشت به فروشگاه</Link>
        ) : s?.kind === "LISTING_PLAN" ? (
          <Link href={paid ? "/login" : "/finder/manage"} className="press mt-5 inline-block rounded-[14px] bg-[image:var(--grad-rose)] px-5 py-2.5 text-[13.5px] font-bold text-white">{paid ? "ورود به پنل" : "بازگشت به پروفایل"}</Link>
        ) : (
          <Link href="/modules" className="press mt-5 inline-block rounded-[14px] bg-[image:var(--grad-rose)] px-5 py-2.5 text-[13.5px] font-bold text-white">بازگشت به پنل</Link>
        )}
      </Card>
    </div>
  );
}

export default function PaymentResultPage() {
  return <Suspense fallback={null}><Result /></Suspense>;
}
