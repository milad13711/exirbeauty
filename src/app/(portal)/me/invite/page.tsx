"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { portal } from "@/lib/portalApi";
import { faNum } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

export default function Invite() {
  const q = useQuery(portal.invite, []);
  const [copied, setCopied] = useState(false);
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const c = q.data;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}${c.path}`;
  return (
    <>
      <div><h1 className="text-lg font-extrabold">معرفی دوستان</h1><p className="text-sm text-ink2">دوستانتان را بیاورید؛ هر دو هدیه بگیرید</p></div>
      {!c.enabled && <p className="rounded-xl bg-surface2 p-3 text-sm text-ink2">برنامه‌ی معرفی موقتاً غیرفعال است.</p>}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-line text-center">
          <div className="bg-rosesoft p-4"><p className="text-xs text-rosedeep">شما می‌گیرید</p><p className="mt-1 text-xl font-extrabold text-rosedeep">{faNum(c.referrerPts)} امتیاز</p></div>
          <div className="bg-goldsoft p-4"><p className="text-xs text-gold">دوستتان می‌گیرد</p><p className="mt-1 text-xl font-extrabold text-gold">{faNum(c.friendOff)}٪ تخفیف</p></div>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs text-ink2">لینک اختصاصی شما (پس از اولین خرید دوست، پاداش خودکار ثبت می‌شود):</p>
          <bdi dir="ltr" className="block truncate rounded-xl border border-dashed border-rose/50 bg-rosesoft/40 p-3 text-sm text-rosedeep">{link}</bdi>
          <Button className="w-full" onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <><Check size={14} />کپی شد</> : <><Copy size={14} />کپی لینک</>}</Button>
        </div>
      </Card>
      <Card className="p-5 text-sm text-ink2">{faNum(c.friends)} دوست از لینک شما نوبت گرفته‌اند · {faNum(c.rewardedFriends)} نفر خرید کرده‌اند · {faNum(c.pointsEarned)} امتیاز کسب کرده‌اید.</Card>
    </>
  );
}
