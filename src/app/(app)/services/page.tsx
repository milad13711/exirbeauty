"use client";
import { useState } from "react";
import clsx from "clsx";
import { Clock, Package, Percent, Plus, Tag, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";
import { catColor, staff, type Category } from "@/lib/mock";
import { catalog } from "@/lib/mock2";
import { fa, short } from "@/lib/fa";

const cats: ("همه" | Category)[] = ["همه", "مو", "پوست", "ناخن"];

export default function Services() {
  const [cat, setCat] = useState<(typeof cats)[number]>("همه");
  const [selId, setSelId] = useState("v1");
  const rows = catalog.filter((s) => cat === "همه" || s.cat === cat);
  const sel = catalog.find((s) => s.id === selId)!;
  const profit = sel.price - sel.materialCost - (sel.price * sel.commission) / 100;

  return (
    <>
      <PageTitle title="منوی خدمات" sub="کاتالوگ خدمات سالن با قیمت، زمان، متخصص، مواد مصرفی و کمیسیون" actions={<Button><Plus size={14} />خدمت جدید</Button>} />
      <div className="mb-4 flex gap-2" role="tablist">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={clsx("cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold", cat === c ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{c}</button>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => {
            const cc = catColor[s.cat];
            return (
              <button key={s.id} onClick={() => setSelId(s.id)} className={clsx("cursor-pointer rounded-2xl border bg-surface p-4 text-right transition-shadow hover:shadow-md", selId === s.id ? "border-rose ring-1 ring-rose" : "border-line", !s.active && "opacity-55")}>
                <div className="flex items-center justify-between"><Badge className={clsx(cc.bg, cc.fg)}>{s.cat}</Badge>{!s.active && <Badge>غیرفعال</Badge>}</div>
                <p className="mt-3 text-[15px] font-bold">{s.name}</p>
                <div className="mt-2 flex items-center justify-between text-sm"><span className="inline-flex items-center gap-1 text-ink2"><Clock size={13} />{fa(s.min)} دقیقه</span><b>{short(s.price)}</b></div>
                <div className="mt-3 flex -space-x-reverse -space-x-2">{s.staff.map((id) => { const p = staff.find((x) => x.id === id)!; return <span key={id} className="rounded-full ring-2 ring-surface"><Avatar name={p.name} color={p.color} size={24} /></span>; })}</div>
              </button>
            );
          })}
        </div>

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHead title={sel.name} hint={`${sel.cat} · ${fa(sel.min)} دقیقه`} action={<Badge tone={sel.active ? "sage" : "neutral"}>{sel.active ? "فعال" : "غیرفعال"}</Badge>} />
          <div className="space-y-4 px-5 pb-5 text-sm">
            <dl className="divide-y divide-line">
              {[["قیمت", short(sel.price)], ["ظرفیت", sel.capacity], ["کمیسیون متخصص", `${fa(sel.commission)}٪`]].map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-ink3">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
            </dl>
            <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink3"><Users size={13} />متخصص‌های قابل ارائه</p>
              <div className="flex flex-wrap gap-1.5">{sel.staff.map((id) => <Badge key={id}>{staff.find((x) => x.id === id)!.name}</Badge>)}</div></div>
            <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink3"><Package size={13} />مواد مصرفی (هزینه {short(sel.materialCost)})</p><p className="text-ink2">{sel.materials}</p></div>
            {sel.discount && <p className="flex items-center gap-1.5"><Percent size={14} className="text-amber" /><Badge tone="amber">{sel.discount}</Badge></p>}
            {sel.pkg && <p className="flex items-center gap-1.5"><Tag size={14} className="text-gold" /><Badge tone="gold">{sel.pkg}</Badge></p>}
            <div className="rounded-xl bg-sagesoft p-3"><p className="text-xs text-sage">سود خالص هر بار ارائه (پس از مواد و کمیسیون)</p><p className="mt-0.5 text-lg font-extrabold text-sage">{short(profit)} تومان</p></div>
            <div className="flex gap-2"><Button className="flex-1">ویرایش</Button><Button variant="ghost">{sel.active ? "غیرفعال‌سازی" : "فعال‌سازی"}</Button></div>
          </div>
        </Card>
      </div>
    </>
  );
}
