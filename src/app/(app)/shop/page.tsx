"use client";
import { useState } from "react";
import clsx from "clsx";
import { Link2, Package, ShoppingBag, Store, Truck } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { fa, short } from "@/lib/fa";

const models = [
  { k: "b2c", t: "B2C · مراقبتی برای مشتری", icon: ShoppingBag, d: "شامپو، ماسک، سرم و محصولات پوست به مشتری سالن" },
  { k: "b2b", t: "B2B · مواد مصرفی سالن", icon: Truck, d: "رنگ، اکسیدان، کراتین، دستکش و ابزار برای سالن‌ها" },
  { k: "aff", t: "Affiliate · محصولات پیشنهادی من", icon: Link2, d: "خرید از لینک مشتری/متخصص با پورسانت یا امتیاز" },
] as const;
const products = [
  { n: "شامپو ترمیم‌کننده", m: "b2c", p: 650_000, s: 34, tag: "پس از کراتین" },
  { n: "ماسک مو ابریشم", m: "b2c", p: 780_000, s: 22, tag: "پیشنهاد رنگ" },
  { n: "سرم ویتامین C", m: "b2c", p: 1_150_000, s: 9, tag: "پوست ترکیبی" },
  { n: "اکسیدان ۶٪ (بسته ۱۲تایی)", m: "b2b", p: 3_600_000, s: 4, tag: "موجودی کم" },
  { n: "رنگ مو حرفه‌ای (کارتن)", m: "b2b", p: 8_200_000, s: 18, tag: "عمده" },
  { n: "دستکش نیتریل (۱۰۰ عددی)", m: "b2b", p: 420_000, s: 60, tag: "" },
  { n: "ست مراقبت رنگ (لینک سارا)", m: "aff", p: 1_900_000, s: 12, tag: "۵٪ پورسانت" },
];

export default function Shop() {
  const [m, setM] = useState<"b2c" | "b2b" | "aff">("b2c");
  const rows = products.filter((x) => x.m === m);
  return (
    <>
      <PageTitle title="فروشگاه آنلاین تخصصی" sub="سه مدل فروش در یک فروشگاه؛ درآمد سالن بعد از ارائه‌ی خدمت هم ادامه دارد" actions={<Button>+ محصول جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="فروش آنلاین ماه" value={short(38_400_000)} tone="rose" icon={<Store size={16} />} />
        <Stat label="سفارش‌های امروز" value={fa(7)} tone="sky" />
        <Stat label="پورسانت معرف‌ها" value={short(1_900_000)} tone="gold" />
        <Stat label="کالاهای کم‌موجودی" value={fa(3)} tone="danger" icon={<Package size={16} />} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {models.map((x) => { const I = x.icon; return (
          <button key={x.k} onClick={() => setM(x.k)} className={clsx("cursor-pointer rounded-2xl border bg-surface p-4 text-right", m === x.k ? "border-rose ring-1 ring-rose" : "border-line hover:bg-surface2")}>
            <I className="text-rose" size={20} /><p className="mt-2 font-bold">{x.t}</p><p className="mt-1 text-xs text-ink2">{x.d}</p>
          </button>); })}
      </div>
      <Card className="mt-5">
        <CardHead title="محصولات" />
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li key={p.n} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span className="grid size-11 place-items-center rounded-xl bg-goldsoft text-gold"><Package size={18} /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold">{p.n}</p>{p.tag && <Badge tone={p.tag === "موجودی کم" ? "danger" : "gold"} className="mt-1">{p.tag}</Badge>}</div>
              <span className="text-xs text-ink3">{fa(p.s)} در انبار</span><b className="text-sm">{short(p.p)}</b>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
