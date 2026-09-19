"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge, Button, Card, CardHead } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { useDB } from "@/lib/db";
import { fa } from "@/lib/fa";

export default function Invite() {
  const db = useDB();
  const me = useMe();
  const [copied, setCopied] = useState(false);
  if (!me) return null;
  const link = `exirbeauty.ir/book?ref=${me.id}`;
  const friends = db.customers.filter((c) => c.referredBy === me.id);
  const cfg = db.referral;
  return (
    <>
      <div><h1 className="text-lg font-extrabold">معرفی دوستان</h1><p className="text-sm text-ink2">دوستانتان را بیاورید؛ هر دو هدیه بگیرید</p></div>
      {!cfg.enabled && <p className="rounded-xl bg-surface2 p-3 text-sm text-ink2">برنامه‌ی معرفی موقتاً غیرفعال است.</p>}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-line text-center">
          <div className="bg-rosesoft p-4"><p className="text-xs text-rosedeep">شما می‌گیرید</p><p className="mt-1 text-xl font-extrabold text-rosedeep">{fa(cfg.referrerPts)} امتیاز</p></div>
          <div className="bg-goldsoft p-4"><p className="text-xs text-gold">دوستتان می‌گیرد</p><p className="mt-1 text-xl font-extrabold text-gold">{fa(cfg.friendOff)}٪ تخفیف</p></div>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-xs text-ink2">لینک اختصاصی شما (پس از اولین خرید دوست، پاداش خودکار ثبت می‌شود):</p>
          <bdi dir="ltr" className="block truncate rounded-xl border border-dashed border-rose/50 bg-rosesoft/40 p-3 text-sm text-rosedeep">{link}</bdi>
          <Button className="w-full" onClick={() => { navigator.clipboard?.writeText(`https://${link}`).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <><Check size={14} />کپی شد</> : <><Copy size={14} />کپی لینک</>}</Button>
        </div>
      </Card>
      <Card>
        <CardHead title="دوستان معرفی‌شده" hint={`${fa(me.referrals)} نفر خرید کرده‌اند`} />
        <ul className="divide-y divide-line">
          {friends.map((f) => <li key={f.id} className="flex items-center gap-3 px-5 py-3 text-sm"><b className="min-w-0 flex-1 truncate">{f.name}</b>{f.visits > 0 ? <Badge tone="sage">خرید کرده</Badge> : <Badge tone="amber">در انتظار اولین خرید</Badge>}</li>)}
          {!friends.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز کسی از لینک شما ثبت‌نام نکرده است.</li>}
        </ul>
      </Card>
    </>
  );
}
