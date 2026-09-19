"use client";
import { useState } from "react";
import { Check, Copy, Share2, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { growth } from "@/lib/growth";
import { fa, short } from "@/lib/fa";

export default function ReferralPage() {
  const db = useDB();
  const [cfg, setCfg] = useState(db.referral);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const referred = db.customers.filter((c) => c.referredBy);
  const converted = referred.filter((c) => c.visits > 0);
  const top = db.customers.filter((c) => c.referrals > 0).sort((a, b) => b.referrals - a.referrals).slice(0, 6);
  const set = (p: Partial<typeof cfg>) => { setCfg({ ...cfg, ...p }); setSaved(false); };
  const copy = (id: string) => { navigator.clipboard?.writeText(`https://exirbeauty.ir/book?ref=${id}`).catch(() => {}); setCopied(id); setTimeout(() => setCopied(null), 1600); };

  return (
    <>
      <PageTitle title="معرفی دوستان (Referral)" sub="هر مشتری لینک اختصاصی دارد؛ پاداش پس از اولین خرید دوست خودکار ثبت می‌شود"
        actions={<><Button onClick={() => { growth.saveReferral(cfg); setSaved(true); }}>ذخیره</Button>{saved && <span role="status" className="self-center text-sm font-bold text-sage">ذخیره شد ✓</span>}</>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="مشتری معرفی‌شده" value={fa(referred.length)} tone="rose" icon={<UserPlus size={16} />} />
        <Stat label="اولین خرید انجام‌شده" value={fa(converted.length)} tone="sage" />
        <Stat label="نرخ تبدیل" value={referred.length ? `${fa(Math.round((converted.length / referred.length) * 100))}٪` : "—"} tone="gold" />
        <Stat label="معرف‌های فعال" value={fa(db.customers.filter((c) => c.referrals > 0).length)} tone="sky" icon={<Share2 size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="پاداش‌ها" hint="در صندوق و پنل مشتری اعمال می‌شود" />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex items-center gap-3"><Toggle on={cfg.enabled} onChange={(v) => set({ enabled: v })} label="فعال بودن برنامه‌ی معرفی" /><span className="text-sm">{cfg.enabled ? "برنامه‌ی معرفی فعال است" : "غیرفعال"}</span></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="امتیاز معرف"><input type="number" min={0} value={cfg.referrerPts} onChange={(e) => set({ referrerPts: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>
              <Field label="تخفیف دوست (٪)"><input type="number" min={0} max={60} value={cfg.friendOff} onChange={(e) => set({ friendOff: Math.min(60, Math.max(0, +e.target.value || 0)) })} className={fieldCls} /></Field>
            </div>
            <ol className="space-y-1.5 text-sm text-ink2">{["مشتری لینک اختصاصی خود را می‌فرستد", "دوست از لینک نوبت می‌گیرد و در CRM ثبت می‌شود", `در اولین فاکتور، ${fa(cfg.friendOff)}٪ تخفیف پیشنهاد می‌شود`, `معرف ${fa(cfg.referrerPts)} امتیاز می‌گیرد`].map((t, i) => <li key={t} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose text-[11px] font-bold text-white">{fa(i + 1)}</span>{t}</li>)}</ol>
          </div>
        </Card>
        <Card>
          <CardHead title="برترین معرف‌ها" />
          <ul className="divide-y divide-line">
            {top.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3"><Avatar name={c.name} size={34} /><span className="min-w-0 flex-1 basis-28"><b className="block text-sm">{c.name}</b><span className="text-xs text-ink3">{fa(c.referrals)} مشتری معرفی‌شده</span></span><Button variant="ghost" onClick={() => copy(c.id)}>{copied === c.id ? <><Check size={13} />کپی شد</> : <><Copy size={13} />لینک</>}</Button></li>
            ))}
            {!top.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز معرفی ثبت نشده است.</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead title="مشتریان معرفی‌شده" />
        <ul className="divide-y divide-line">
          {referred.map((c) => <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm"><b className="min-w-0 flex-1 basis-32">{c.name}</b><span className="text-xs text-ink3">معرف: {db.customers.find((x) => x.id === c.referredBy)?.name ?? "—"}</span>{c.visits > 0 ? <Badge tone="sage">خرید کرده · {short(c.total)}</Badge> : <Badge tone="amber">منتظر اولین خرید</Badge>}</li>)}
          {!referred.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز مشتری معرفی‌شده‌ای نیست.</li>}
        </ul>
      </Card>
    </>
  );
}
