"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { courses as seed } from "@/lib/mock4";
import { fa, short } from "@/lib/fa";

type C = (typeof seed)[number];

export default function Courses() {
  const [rows, setRows] = useState<C[]>(seed);
  const [draft, setDraft] = useState<C | null>(null);
  const set = <K extends keyof C>(k: K, v: C[K]) => setDraft(draft && { ...draft, [k]: v });
  const revenue = rows.reduce((a, c) => a + c.price * c.students, 0);

  return (
    <>
      <PageTitle title="دوره‌های آموزشی" sub="آکادمی برای مدیر سالن و متخصص؛ رایگان یا پولی، یا شامل پلن‌ها" actions={<Button onClick={() => setDraft({ id: `n${Date.now()}`, title: "", audience: "مدیر سالن", price: 0, lessons: 1, hours: 1, students: 0, published: false, inPlan: "—" })}><Plus size={14} />دوره‌ی جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="دوره‌ها" value={fa(rows.length)} tone="rose" />
        <Stat label="منتشرشده" value={fa(rows.filter((c) => c.published).length)} tone="sage" />
        <Stat label="کل دانشجویان" value={fa(rows.reduce((a, c) => a + c.students, 0))} tone="sky" />
        <Stat label="درآمد دوره‌ها" value={short(revenue)} tone="gold" />
      </div>

      {draft && (
        <Card className="mt-5">
          <CardHead title="دوره‌ی جدید" />
          <form onSubmit={(e) => { e.preventDefault(); if (!draft.title.trim()) return; setRows([draft, ...rows]); setDraft(null); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="عنوان دوره"><input required value={draft.title} onChange={(e) => set("title", e.target.value)} className={fieldCls} /></Field></div>
            <Field label="مخاطب"><select value={draft.audience} onChange={(e) => set("audience", e.target.value as C["audience"])} className={fieldCls}><option>مدیر سالن</option><option>متخصص</option></select></Field>
            <Field label="قیمت (تومان؛ ۰ = رایگان)"><input type="number" min={0} value={draft.price} onChange={(e) => set("price", +e.target.value || 0)} className={fieldCls} /></Field>
            <Field label="تعداد درس"><input type="number" min={1} value={draft.lessons} onChange={(e) => set("lessons", +e.target.value || 1)} className={fieldCls} /></Field>
            <Field label="شامل پلن"><select value={draft.inPlan} onChange={(e) => set("inPlan", e.target.value)} className={fieldCls}><option>—</option><option>همه‌ی پلن‌ها</option><option>حرفه‌ای و بالاتر</option><option>سازمانی</option></select></Field>
            <div className="flex gap-2 sm:col-span-2"><Button type="submit">ذخیره به‌عنوان پیش‌نویس</Button><Button type="button" variant="ghost" onClick={() => setDraft(null)}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <Card className="mt-5">
        <DataList rows={rows} id={(c) => c.id} cols={[
          { h: "دوره", title: true, cell: (c) => c.title },
          { h: "مخاطب", cell: (c) => <Badge tone={c.audience === "متخصص" ? "sage" : "rose"}>{c.audience}</Badge> },
          { h: "قیمت", cell: (c) => (c.price ? <b>{short(c.price)}</b> : <Badge tone="gold">رایگان</Badge>) },
          { h: "درس / ساعت", cell: (c) => `${fa(c.lessons)} / ${fa(c.hours)}` },
          { h: "شامل پلن", cell: (c) => c.inPlan },
          { h: "دانشجو", cell: (c) => fa(c.students) },
          { h: "منتشر شود", cell: (c) => <Toggle on={c.published} label={`انتشار ${c.title}`} onChange={(v) => setRows(rows.map((r) => (r.id === c.id ? { ...r, published: v } : r)))} /> },
        ]} />
      </Card>
    </>
  );
}
