"use client";
/* eslint-disable @next/next/no-img-element -- عکس‌ها data-URL محلی‌اند */
import Link from "next/link";
import { useState } from "react";
import { CalendarClock, ChevronRight, MapPin, Star } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { listPros } from "@/lib/market";
import { clock } from "@/lib/booking";
import { dayInfo } from "@/lib/dates";
import { ops } from "@/lib/ops";
import { digits } from "@/lib/validate";
import { fa, short } from "@/lib/fa";

export function ProProfile({ id }: { id: string }) {
  const db = useDB();
  const p = listPros(db).find((x) => x.id === id);
  const [f, setF] = useState({ name: "", phone: "", service: "", note: "" });
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  if (!p) return <div className="py-20 text-center text-ink2">متخصص پیدا نشد. <Link href="/explore" className="font-bold text-rose">بازگشت</Link></div>;

  const reviews = p.own ? db.surveys.filter((s) => s.staffId === p.staffId && s.rating && s.route === "public").slice(0, 4).map((s) => ({ n: s.name.split(" ")[0], r: s.rating!, t: s.comment })) : [{ n: "مشتری", r: 5, t: "تجربه‌ی عالی؛ حتماً دوباره می‌روم." }, { n: "مشتری", r: 4, t: "حرفه‌ای و دقیق." }];
  const works = p.own ? db.posts.filter((x) => x.status === "منتشر شد" && (x.before || x.after)).slice(0, 4) : [];
  const req = () => {
    if (f.name.trim().length < 3) return setErr("نام را وارد کنید.");
    if (!/^09\d{9}$/.test(digits(f.phone).replace(/\s/g, ""))) return setErr("موبایل معتبر نیست.");
    ops.notify("admin", "درخواست رزرو مارکت‌پلیس", `${f.name.trim()} از ${p.name} (${p.salon}) درخواست ${f.service || "خدمت"} دارد`, "/admin");
    setErr(""); setSent(true);
  };

  return (
    <>
      <Link href="/explore" className="mb-4 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />همه‌ی متخصص‌ها</Link>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={p.name} size={72} color={p.own ? "#b4536f" : "#8a5fb0"} />
              <div className="min-w-0 flex-1"><h1 className="text-xl font-extrabold">{p.name}</h1><p className="flex items-center gap-1 text-sm text-ink2"><MapPin size={14} />{p.salon} · {p.city}</p><p className="mt-1 flex items-center gap-3 text-sm"><span className="font-bold text-gold"><Star size={14} className="ml-0.5 inline" fill="currentColor" />{fa(String(p.rating || "—").replace(".", "٫"))}</span><span className="text-ink3">{fa(p.reviews)} نظر · {fa(p.works)} نمونه‌کار</span></p></div>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink2">{p.bio}</p>
          </Card>
          <Card>
            <CardHead title="خدمات و قیمت" />
            <ul className="divide-y divide-line">{p.services.map((s) => <li key={s.name} className="flex items-center justify-between px-5 py-3 text-sm"><span>{s.name}{s.min && <span className="mr-2 text-xs text-ink3">{fa(s.min)} دقیقه</span>}</span><b>{short(s.price)}</b></li>)}</ul>
          </Card>
          <Card>
            <CardHead title="نمونه‌کارها" />
            <div className="grid grid-cols-3 gap-2 px-5 pb-5">
              {works.length ? works.flatMap((w) => [w.before, w.after].filter(Boolean) as string[]).slice(0, 6).map((src, i) => <img key={i} src={src} alt="نمونه‌کار" className="aspect-square w-full rounded-xl object-cover" />) : [0, 1, 2].map((i) => <div key={i} className="aspect-square rounded-xl" style={{ background: `linear-gradient(150deg, ${p.tint[0]}, ${p.tint[1]})` }} />)}
            </div>
          </Card>
          <Card>
            <CardHead title="نظر مشتری‌ها" />
            <ul className="divide-y divide-line">{reviews.map((r, i) => <li key={i} className="px-5 py-3 text-sm"><b>{r.n}</b> <span className="text-gold">{"★".repeat(r.r)}</span><p className="mt-0.5 text-ink2">{r.t || "—"}</p></li>)}</ul>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-6">
          <CardHead title="رزرو نوبت" />
          <div className="space-y-3 px-5 pb-5">
            {p.own ? (
              <>
                {p.slot ? <p className="flex items-center gap-2 rounded-xl bg-sagesoft p-3 text-sm text-sage"><CalendarClock size={16} />اولین وقت خالی: <b>{p.slot.day === 0 ? "امروز" : dayInfo(p.slot.day).weekday} {clock(p.slot.start)}</b></p> : <p className="rounded-xl bg-ambersoft p-3 text-sm text-amber">وقت خالی در ۷ روز آینده وجود ندارد؛ می‌توانید به لیست انتظار بپیوندید.</p>}
                <Link href={`/book?staff=${p.staffId}`} className="block rounded-xl bg-rose py-3 text-center text-sm font-bold text-white hover:bg-rosedeep">رزرو نوبت از {p.name.split(" ")[0]}</Link>
              </>
            ) : sent ? <p role="status" className="rounded-xl bg-sagesoft p-4 text-center text-sm text-sage">درخواست شما ثبت شد؛ سالن برای هماهنگی با شما تماس می‌گیرد.</p> : (
              <>
                <p className="text-xs leading-6 text-ink2">این سالن هنوز رزرو آنلاین مستقیم ندارد؛ درخواست بدهید تا تماس بگیرند.</p>
                <Field label="نام"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={fieldCls} /></Field>
                <Field label="موبایل"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
                <Field label="خدمت"><select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} className={fieldCls}><option value="">انتخاب…</option>{p.services.map((s) => <option key={s.name}>{s.name}</option>)}</select></Field>
                {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
                <Button className="w-full" onClick={req}>ارسال درخواست</Button>
              </>
            )}
            <Badge tone="neutral">پرداخت در محل سالن</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}
