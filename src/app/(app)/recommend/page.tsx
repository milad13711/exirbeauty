"use client";
import { useState } from "react";
import clsx from "clsx";
import { Trash2, Wand2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { growth } from "@/lib/growth";
import { useDB, type RecRule } from "@/lib/db";
import { fa, short } from "@/lib/fa";

/** قوانین پیش‌فرض تا وقتی سالن چیزی ذخیره نکرده (بر پایه‌ی نام خدمت‌ها/محصولات) */
function defaults(services: { id: string; name: string }[], products: { id: string; cat: string }[]): RecRule[] {
  const hair = products.filter((p) => p.cat === "مو").map((p) => p.id).slice(0, 3);
  const skin = products.filter((p) => p.cat === "پوست").map((p) => p.id).slice(0, 3);
  const pick = (re: RegExp) => services.filter((s) => re.test(s.name)).map((s) => s.id);
  return [
    { id: "r1", serviceIds: pick(/کراتین|رنگ|مش|دکلره|کوتاه/), why: "برای حفظ نتیجه‌ی رنگ و کراتین", productIds: hair, on: true },
    { id: "r2", serviceIds: pick(/فیشال|پاکسازی|پوست/), why: "برای نگهداری از نتیجه‌ی مراقبت پوست", productIds: skin, on: true },
  ].filter((r) => r.serviceIds.length && r.productIds.length);
}
const uid = () => `r${Date.now().toString(36)}`;

export default function Recommend() {
  const db = useDB();
  const rules = db.recRules ?? defaults(db.services, db.products);
  const [edit, setEdit] = useState<RecRule | null>(null);
  const save = (next: RecRule[]) => growth.saveRecRules(next);

  const ready = (r: RecRule) => {
    const names = new Set(db.services.filter((s) => r.serviceIds.includes(s.id)).map((s) => s.name));
    return db.customers.filter((c) => c.log.slice(0, 2).some((l) => names.has(l.s))).length;
  };
  const first = rules.find((r) => r.on) ?? rules[0];
  const svcName = first ? db.services.find((s) => first.serviceIds.includes(s.id))?.name ?? "خدمت" : "";
  const prods = first ? db.products.filter((p) => first.productIds.includes(p.id)) : [];

  return (
    <>
      <PageTitle title="توصیه هوشمند محصول" sub="خدمت ← توصیه ← محصول ← درآمد؛ محصولات از فروشگاه اکسیر و با پورسانت به کیف پول سالن" actions={<Button onClick={() => setEdit({ id: uid(), serviceIds: [], why: "", productIds: [], on: true })}>+ قانون جدید</Button>} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {rules.map((r) => {
            const names = db.services.filter((s) => r.serviceIds.includes(s.id)).map((s) => s.name);
            const n = ready(r);
            return (
              <Card key={r.id} className={clsx(!r.on && "opacity-60")}>
                <CardHead title={`بعد از «${names.slice(0, 2).join("، ")}${names.length > 2 ? ` و ${fa(names.length - 2)} خدمت دیگر` : ""}»`} hint={r.why} action={<Toggle on={r.on} onChange={(v) => save(rules.map((x) => (x.id === r.id ? { ...x, on: v } : x)))} label="فعال بودن قانون" />} />
                <div className="flex flex-wrap gap-2 px-5">{db.products.filter((p) => r.productIds.includes(p.id)).map((p) => <span key={p.id} className="rounded-xl border border-line px-3 py-2 text-sm">{p.name} <b className="mr-1 text-ink2">{short(p.price)}</b></span>)}</div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <Badge tone={n ? "sage" : "neutral"}>{n ? `${fa(n)} مشتری تازه خدمت گرفته‌اند` : "مشتریِ تازه‌ای نیست"}</Badge>
                  <span className="flex gap-2"><Button variant="ghost" onClick={() => setEdit(r)}>ویرایش</Button><Button variant="ghost" aria-label="حذف قانون" onClick={() => save(rules.filter((x) => x.id !== r.id))}><Trash2 size={15} /></Button></span>
                </div>
              </Card>
            );
          })}
          {!rules.length && <Card className="p-8 text-center text-sm text-ink3">قانونی ثبت نشده است. با «قانون جدید» شروع کنید.</Card>}
          {edit && (
            <Card>
              <CardHead title={rules.some((r) => r.id === edit.id) ? "ویرایش قانون" : "قانون جدید"} />
              <div className="space-y-4 px-5 pb-5">
                <Field label="بعد از کدام خدمت‌ها؟">
                  <div className="flex flex-wrap gap-2">{db.services.filter((s) => s.active).map((s) => { const on = edit.serviceIds.includes(s.id); return <button key={s.id} type="button" aria-pressed={on} onClick={() => setEdit({ ...edit, serviceIds: on ? edit.serviceIds.filter((x) => x !== s.id) : [...edit.serviceIds, s.id] })} className={clsx("press min-h-9 cursor-pointer rounded-full border px-3 text-xs font-bold", on ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line bg-surface text-ink2")}>{s.name}</button>; })}</div>
                </Field>
                <Field label="کدام محصولات پیشنهاد شود؟">
                  <div className="flex flex-wrap gap-2">{db.products.filter((p) => p.active).map((p) => { const on = edit.productIds.includes(p.id); return <button key={p.id} type="button" aria-pressed={on} onClick={() => setEdit({ ...edit, productIds: on ? edit.productIds.filter((x) => x !== p.id) : [...edit.productIds, p.id] })} className={clsx("press min-h-9 cursor-pointer rounded-full border px-3 text-xs font-bold", on ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line bg-surface text-ink2")}>{p.name}</button>; })}</div>
                </Field>
                <Field label="دلیل توصیه (در پیام به مشتری)"><input value={edit.why} onChange={(e) => setEdit({ ...edit, why: e.target.value })} placeholder="مثلاً برای حفظ نتیجه‌ی کراتین" className={fieldCls} /></Field>
                <div className="flex gap-2">
                  <Button disabled={!edit.serviceIds.length || !edit.productIds.length || !edit.why.trim()} onClick={() => { save(rules.some((r) => r.id === edit.id) ? rules.map((r) => (r.id === edit.id ? edit : r)) : [...rules, edit]); setEdit(null); }}>ذخیره قانون</Button>
                  <Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHead title="پیام مشتری پس از خدمت" hint="پیش‌نمایش از اولین قانون فعال" action={<Wand2 size={16} className="text-rose" />} />
          {first ? (
            <div className="space-y-3 px-5 pb-5">
              <div className="rounded-2xl rounded-br-sm bg-sagesoft p-4 text-sm leading-7">سارا جان، از «{svcName}» راضی بودید؟ 🌸 {first.why}، این {fa(prods.length)} محصول را پیشنهاد می‌کنیم.</div>
              {prods.map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3 text-sm"><span className="min-w-0 truncate">{p.name}</span><span className="shrink-0 text-xs font-bold text-rosedeep">{fa(p.commission)}٪ پورسانت</span></div>)}
              <p className="text-xs leading-6 text-ink3">سفارش از لینک اختصاصی سالن ثبت می‌شود و پورسانت به کیف پول سالن می‌رود.</p>
            </div>
          ) : <p className="px-5 pb-5 text-sm text-ink3">با ساخت اولین قانون، پیش‌نمایش پیام اینجا دیده می‌شود.</p>}
        </Card>
      </div>
    </>
  );
}
