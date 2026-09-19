"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { useDB, type Course } from "@/lib/db";
import { ops } from "@/lib/ops";
import { uid } from "@/lib/factories";
import { fa, short } from "@/lib/fa";

const blank = (): Course => ({ id: uid("c"), title: "", audience: "مدیر سالن", price: 0, hours: 1, inPlan: "—", published: false, description: "", lessons: [{ id: uid("l"), title: "", minutes: 10, body: "" }] });

export default function Courses() {
  const db = useDB();
  const [edit, setEdit] = useState<Course | null>(null);
  const [err, setErr] = useState("");
  const [del, setDel] = useState<string | null>(null);
  const set = <K extends keyof Course>(k: K, v: Course[K]) => setEdit(edit && { ...edit, [k]: v });
  const isNew = edit && !db.courses.some((c) => c.id === edit.id);
  const students = (id: string) => db.enrollments.filter((e) => e.courseId === id).length;
  const revenue = db.enrollments.reduce((a, e) => a + e.paid, 0);
  const move = (i: number, d: number) => { if (!edit) return; const l = [...edit.lessons]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; set("lessons", l); };

  const save = () => {
    if (!edit) return;
    if (edit.title.trim().length < 3) return setErr("عنوان دوره را وارد کنید.");
    if (edit.lessons.length === 0 || edit.lessons.some((l) => l.title.trim().length < 2)) return setErr("حداقل یک درس با عنوان لازم است.");
    if (edit.published && edit.lessons.some((l) => l.body.trim().length < 10)) return setErr("برای انتشار، متن هر درس را کامل کنید.");
    ops.saveCourse({ ...edit, title: edit.title.trim(), hours: Math.round((edit.lessons.reduce((a, l) => a + l.minutes, 0) / 60) * 10) / 10 || edit.hours });
    setEdit(null); setErr("");
  };

  return (
    <>
      <PageTitle title="دوره‌های آموزشی" sub="آکادمی برای مدیر سالن و متخصص؛ رایگان، پولی یا شامل پلن" actions={<Button onClick={() => { setEdit(blank()); setErr(""); }}><Plus size={14} />دوره‌ی جدید</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="دوره‌ها" value={fa(db.courses.length)} tone="rose" />
        <Stat label="منتشرشده" value={fa(db.courses.filter((c) => c.published).length)} tone="sage" />
        <Stat label="ثبت‌نام‌ها" value={fa(db.enrollments.length)} tone="sky" />
        <Stat label="درآمد دوره‌ها" value={short(revenue)} tone="gold" />
      </div>

      {edit && (
        <Card className="mt-5">
          <CardHead title={isNew ? "دوره‌ی جدید" : "ویرایش دوره"} />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2"><Field label="عنوان دوره"><input value={edit.title} onChange={(e) => set("title", e.target.value)} className={fieldCls} /></Field></div>
              <Field label="مخاطب"><select value={edit.audience} onChange={(e) => set("audience", e.target.value as Course["audience"])} className={fieldCls}><option>مدیر سالن</option><option>متخصص</option></select></Field>
              <Field label="قیمت (تومان؛ ۰ = رایگان)"><input type="number" min={0} step={10000} value={edit.price} onChange={(e) => set("price", +e.target.value || 0)} className={fieldCls} /></Field>
              <Field label="شامل پلن"><select value={edit.inPlan} onChange={(e) => set("inPlan", e.target.value)} className={fieldCls}><option>—</option><option>همه‌ی پلن‌ها</option><option>حرفه‌ای و بالاتر</option><option>سازمانی</option></select></Field>
              <div className="flex items-end gap-2 pb-2"><Toggle on={edit.published} onChange={(v) => set("published", v)} label="منتشر شود" /><span className="text-sm">{edit.published ? "منتشر می‌شود" : "پیش‌نویس"}</span></div>
              <div className="sm:col-span-2 lg:col-span-4"><Field label="توضیح"><textarea rows={2} value={edit.description} onChange={(e) => set("description", e.target.value)} className={fieldCls} /></Field></div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-ink2">درس‌ها ({fa(edit.lessons.length)})</p>
              <ul className="space-y-3">
                {edit.lessons.map((l, i) => (
                  <li key={l.id} className="space-y-2 rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-full bg-rose text-[11px] font-bold text-white">{fa(i + 1)}</span>
                      <input aria-label={`عنوان درس ${i + 1}`} value={l.title} onChange={(e) => set("lessons", edit.lessons.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="عنوان درس" className={`${fieldCls} min-w-0 flex-1 basis-40`} />
                      <input aria-label={`مدت درس ${i + 1}`} type="number" min={1} value={l.minutes} onChange={(e) => set("lessons", edit.lessons.map((x, j) => (j === i ? { ...x, minutes: Math.max(1, +e.target.value || 1) } : x)))} className={`${fieldCls} !w-20`} />
                      <span className="text-xs text-ink3">دقیقه</span>
                      <button type="button" aria-label="بالا" onClick={() => move(i, -1)} className="cursor-pointer rounded-lg p-1.5 hover:bg-surface2"><ArrowUp size={14} /></button>
                      <button type="button" aria-label="پایین" onClick={() => move(i, 1)} className="cursor-pointer rounded-lg p-1.5 hover:bg-surface2"><ArrowDown size={14} /></button>
                      <button type="button" aria-label="حذف درس" onClick={() => set("lessons", edit.lessons.filter((_, j) => j !== i))} className="cursor-pointer rounded-lg p-1.5 text-danger hover:bg-dangersoft"><Trash2 size={14} /></button>
                    </div>
                    <textarea aria-label={`متن درس ${i + 1}`} rows={3} value={l.body} onChange={(e) => set("lessons", edit.lessons.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} placeholder="متن درس…" className={fieldCls} />
                  </li>
                ))}
              </ul>
              <Button variant="ghost" className="mt-2" onClick={() => set("lessons", [...edit.lessons, { id: uid("l"), title: "", minutes: 10, body: "" }])}><Plus size={14} />افزودن درس</Button>
            </div>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
            <div className="flex gap-2"><Button onClick={save}>ذخیره</Button><Button variant="ghost" onClick={() => { setEdit(null); setErr(""); }}>انصراف</Button></div>
          </div>
        </Card>
      )}

      <Card className="mt-5">
        <DataList rows={db.courses} id={(c) => c.id} cols={[
          { h: "دوره", title: true, cell: (c) => c.title },
          { h: "مخاطب", cell: (c) => <Badge tone={c.audience === "متخصص" ? "sage" : "rose"}>{c.audience}</Badge> },
          { h: "قیمت", cell: (c) => (c.price ? <b>{short(c.price)}</b> : <Badge tone="gold">رایگان</Badge>) },
          { h: "درس / ساعت", cell: (c) => `${fa(c.lessons.length)} / ${fa(String(c.hours).replace(".", "٫"))}` },
          { h: "شامل پلن", cell: (c) => c.inPlan },
          { h: "دانشجو", cell: (c) => fa(students(c.id)) },
          { h: "منتشر", cell: (c) => <Toggle on={c.published} label={`انتشار ${c.title}`} onChange={(v) => ops.saveCourse({ ...c, published: v })} /> },
          { h: "", cell: (c) => del === c.id ? <span className="flex gap-1.5"><Button className="!bg-danger" onClick={() => { ops.deleteCourse(c.id); setDel(null); }}>حذف قطعی</Button><Button variant="ghost" onClick={() => setDel(null)}>انصراف</Button></span> : <span className="flex gap-1.5"><Button variant="ghost" onClick={() => { setEdit(structuredClone(c)); setErr(""); }}><Pencil size={13} />ویرایش</Button><button aria-label={`حذف ${c.title}`} onClick={() => setDel(c.id)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={14} /></button></span> },
        ]} />
      </Card>
    </>
  );
}
