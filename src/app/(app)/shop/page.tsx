"use client";
import Link from "next/link";
import { useState } from "react";
import { Copy, ExternalLink, Package, Percent, ShoppingBag, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, LinkButton, PageTitle, Stat } from "@/components/ui";
import { useDB } from "@/lib/db";
import { salons } from "@/lib/mock3";
import { fa, short, toman } from "@/lib/fa";

const csTone = { "شارژ شد": "sage", "در انتظار تحویل": "amber", "بدون پورسانت": "neutral", "لغو شد": "danger" } as const;

/** فروشگاه اکسیر از دید سالن: سفارش‌های ثبت‌شده از لینک اختصاصی و پورسانت آن‌ها */
export default function Shop() {
  const db = useDB();
  const me = salons[0];
  const [copied, setCopied] = useState(false);
  const mine = db.orders.filter((o) => o.salon === me.id);
  const credited = mine.filter((o) => o.cs === "شارژ شد").reduce((a, o) => a + o.comm, 0);
  const pending = mine.filter((o) => o.cs === "در انتظار تحویل").reduce((a, o) => a + o.comm, 0);
  const wallet = db.wallets[me.id] ?? 0;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/store?ref=${me.code}`;

  const byProduct = new Map<string, { name: string; qty: number; rev: number }>();
  mine.filter((o) => o.cs !== "لغو شد").forEach((o) => o.lines.forEach((l) => { const cur = byProduct.get(l.name) ?? { name: l.name, qty: 0, rev: 0 }; byProduct.set(l.name, { ...cur, qty: cur.qty + l.qty, rev: cur.rev + l.price * l.qty }); }));
  const top = [...byProduct.values()].sort((a, b) => b.rev - a.rev).slice(0, 5);

  return (
    <>
      <PageTitle title="فروشگاه آنلاین" sub="به مشتریان محصول معرفی کنید؛ پورسانت هر خرید به کیف پول سالن می‌رود و هزینه‌ی اشتراک را کم می‌کند" actions={<LinkButton href={`/store?ref=${me.code}`} variant="ghost"><ExternalLink size={15} />دیدن فروشگاه</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="سفارش از لینک شما" value={fa(mine.length)} tone="sky" icon={<ShoppingBag size={16} />} />
        <Stat label="پورسانت واریزشده" value={short(credited)} tone="sage" icon={<Percent size={16} />} />
        <Stat label="در انتظار تحویل" value={short(pending)} tone="amber" />
        <Stat label="موجودی کیف پول سالن" value={short(wallet)} tone="rose" icon={<Wallet size={16} />} />
      </div>

      <Card className="mt-5 p-5">
        <p className="text-sm font-bold">لینک اختصاصی فروشگاه شما</p>
        <p className="mt-1 text-xs leading-6 text-ink3">در پیامک، اینستاگرام یا پیام بعد از خدمت بگذارید؛ هر خریدی از این لینک به نام سالن شما ثبت می‌شود.</p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface2 p-2 pr-3">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-xs text-ink2">{link}</span>
          <Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}><Copy size={14} />{copied ? "کپی شد" : "کپی"}</Button>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="سفارش‌های شما" hint="آخرین خریدها از لینک اختصاصی" />
          <ul className="divide-y divide-line">
            {[...mine].reverse().slice(0, 8).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <span className="min-w-0 flex-1 basis-32"><b className="block truncate">#{o.id} · {o.customer}</b><span className="text-xs text-ink3">{o.date} · {o.status}</span></span>
                <span className="text-xs font-bold text-ink2">{short(o.total)}</span>
                <Badge tone={csTone[o.cs as keyof typeof csTone] ?? "neutral"}>{o.comm ? `${short(o.comm)} · ` : ""}{o.cs}</Badge>
              </li>
            ))}
            {!mine.length && <li className="px-5 py-10 text-center text-sm text-ink3">هنوز سفارشی از لینک شما ثبت نشده است. لینک را برای مشتریان بفرستید.</li>}
          </ul>
        </Card>
        <Card>
          <CardHead title="پرفروش‌ترین محصولات شما" />
          <ul className="divide-y divide-line">
            {top.map((p) => <li key={p.name} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-goldsoft text-gold"><Package size={17} /></span><span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="text-xs text-ink3">{fa(p.qty)} عدد</span></span><b>{short(p.rev)}</b></li>)}
            {!top.length && <li className="px-5 py-10 text-center text-sm text-ink3">با اولین سفارش، آمار محصولات اینجا می‌آید.</li>}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-ink3">کیف پول شما {toman(wallet)} است؛ برای تمدید اشتراک از <Link href="/settings" className="font-bold text-rose">تنظیمات ← اشتراک</Link> استفاده می‌شود.</p>
        </Card>
      </div>
    </>
  );
}
