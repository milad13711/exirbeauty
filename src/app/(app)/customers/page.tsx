"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Download, FileUp, Plus, Search } from "lucide-react";
import { Avatar, Badge, Button, Card, LinkButton, PageTitle, tierTone } from "@/components/ui";
import { useDB } from "@/lib/db";
import { digits } from "@/lib/validate";
import { exportXlsx } from "@/lib/export";
import { fa, short } from "@/lib/fa";

const filters = [{ k: "all", l: "همه" }, { k: "hot", l: "زمان مراجعه رسیده" }, { k: "lost", l: "در حال از دست رفتن" }, { k: "vip", l: "VIP" }] as const;
const riskBadge = { ok: <Badge tone="sage">فعال</Badge>, hot: <Badge tone="amber">وقتش رسیده</Badge>, lost: <Badge tone="danger">در خطر ریزش</Badge> } as const;

export default function Customers() {
  const db = useDB();
  const [f, setF] = useState<(typeof filters)[number]["k"]>("all");
  const [q, setQ] = useState("");
  const qq = digits(q.trim());
  const rows = db.customers.filter((c) => (f === "all" || (f === "vip" ? c.tier === "VIP" : c.risk === f)) && (!qq || c.name.includes(q.trim()) || digits(c.phone).replace(/\s/g, "").includes(qq)));
  return (
    <>
      <PageTitle title="مشتریان" sub={`${fa(db.customers.length)} مشتری · سیستم زمان احتمالی مراجعه بعدی را پیش‌بینی می‌کند`}
        actions={<><Button variant="ghost" onClick={() => exportXlsx("مشتریان", [{ name: "مشتریان", head: ["نام", "موبایل", "جنسیت", "تولد", "سطح", "امتیاز", "مراجعات", "مجموع خرید", "آخرین مراجعه", "خدمت موردعلاقه", "بدهی", "وضعیت"], rows: rows.map((c) => [c.name, c.phone, c.gender, c.birth, c.tier, c.points, c.visits, c.total, c.lastVisit, c.favService, c.debt, c.risk === "ok" ? "فعال" : c.risk === "hot" ? "وقتش رسیده" : "در خطر"]) }])}><Download size={14} />خروجی Excel</Button><LinkButton href="/customers/import" variant="ghost"><FileUp size={14} />ورود از فایل</LinkButton><LinkButton href="/customers/new"><Plus size={14} />مشتری جدید</LinkButton></>} />
      <label className="relative mb-4 block max-w-md"><Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی مشتری" placeholder="جستجوی نام یا شماره…" className="w-full rounded-xl border border-line bg-surface py-2.5 pr-9 pl-3 text-sm outline-none focus:border-rose" /></label>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {filters.map((x) => <button key={x.k} role="tab" aria-selected={f === x.k} onClick={() => setF(x.k)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors", f === x.k ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{x.l}</button>)}
      </div>
      <Card className="md:hidden">
        <ul className="divide-y divide-line">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={c.name} />
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{c.name}</b><span className="block text-xs text-ink3">{fa(c.visits)} مراجعه · {short(c.total)} · {c.lastVisit}</span></span>
                <span className="flex flex-col items-end gap-1"><Badge tone={tierTone[c.tier]}>{c.tier}</Badge>{riskBadge[c.risk]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-right text-xs text-ink3"><tr>{["مشتری", "سطح", "مراجعات", "مجموع خرید", "آخرین مراجعه", "خدمت موردعلاقه", "وضعیت"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-surface2/60">
                <td className="px-5 py-3"><Link href={`/customers/${c.id}`} className="flex items-center gap-3"><Avatar name={c.name} /><span><b className="block text-ink">{c.name}</b><bdi dir="ltr" className="text-xs text-ink3">{c.phone}</bdi></span></Link></td>
                <td className="px-5"><Badge tone={tierTone[c.tier]}>{c.tier}</Badge></td>
                <td className="px-5">{fa(c.visits)}</td>
                <td className="px-5 font-semibold">{short(c.total)}</td>
                <td className="px-5 text-ink2">{c.lastVisit}{c.lastVisitDays > 0 && <span className="text-xs text-ink3"> ({fa(c.lastVisitDays)} روز پیش)</span>}</td>
                <td className="px-5 text-ink2">{c.favService || "—"}</td>
                <td className="px-5">{riskBadge[c.risk]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {!rows.length && <p className="py-10 text-center text-sm text-ink3">مشتری‌ای پیدا نشد. <Link href="/customers/new" className="font-bold text-rose">افزودن مشتری جدید</Link></p>}
    </>
  );
}
