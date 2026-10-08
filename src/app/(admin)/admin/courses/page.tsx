"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm, type AdminCourse } from "@/lib/crmApi";
import { faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

type Draft = Omit<AdminCourse, "id" | "enrollments"> & { id: string | null; plans: string };
const blank = (): Draft => ({ id: null, title: "", description: "", audience: "ALL", hours: 1, price: 0, inPlans: [], plans: "", published: false, lessons: [{ title: "", minutes: 10, body: "" }] });

function Editor({ d: init, onClose, onSaved }: { d: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(init); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const setLesson = (i: number, p: Partial<Draft["lessons"][number]>) => set({ lessons: d.lessons.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  async function save() {
    setErr(""); setBusy(true);
    try {
      const { id, plans, ...b } = d;
      const body = { ...b, inPlans: plans.split(/[\s,،]+/).filter(Boolean) };
      if (id) await crm.adminUpdateCourse(id, body); else await crm.adminCreateCourse(body);
      onSaved(); onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title={d.id ? "ویرایش دوره" : "دوره‌ی جدید"} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="عنوان"><input className={fieldCls} value={d.title} onChange={(e) => set({ title: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="توضیح"><textarea rows={2} className={fieldCls} value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
        <Field label="مخاطب"><select className={fieldCls} value={d.audience} onChange={(e) => set({ audience: e.target.value as Draft["audience"] })}><option value="ALL">همه</option><option value="OWNER">مدیر سالن</option><option value="STAFF">متخصص</option></select></Field>
        <Field label="مدت (ساعت)"><input type="number" step="0.5" min={0.5} className={fieldCls} value={d.hours} onChange={(e) => set({ hours: +e.target.value || 1 })} /></Field>
        <Field label="قیمت (تومان؛ ۰ = رایگان)"><input type="number" min={0} step={10000} className={fieldCls} value={d.price} onChange={(e) => set({ price: Math.max(0, +e.target.value || 0) })} /></Field>
        <Field label="پلن‌هایی که رایگان می‌گیرند (کد، با ویرگول)"><input dir="ltr" className={fieldCls} value={d.plans} onChange={(e) => set({ plans: e.target.value })} placeholder="salon, artist" /></Field>
        <div className="flex items-center gap-3 sm:col-span-2"><Toggle on={d.published} onChange={(v) => set({ published: v })} label="منتشر شود" /><span className="text-sm">{d.published ? "منتشرشده" : "پیش‌نویس"}</span></div>
      </div>
      <h3 className="mb-2 mt-4 text-sm font-bold">درس‌ها</h3>
      <div className="space-y-3">
        {d.lessons.map((l, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex gap-2"><input className={`${fieldCls} !min-h-9`} placeholder="عنوان درس" value={l.title} onChange={(e) => setLesson(i, { title: e.target.value })} /><input type="number" min={1} className={`${fieldCls} !min-h-9 !w-24`} value={l.minutes} onChange={(e) => setLesson(i, { minutes: Math.max(1, +e.target.value || 1) })} aria-label="دقیقه" />{d.lessons.length > 1 && <button aria-label="حذف درس" onClick={() => set({ lessons: d.lessons.filter((_, j) => j !== i) })} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button>}</div>
            <textarea rows={3} className={fieldCls} placeholder="متن درس" value={l.body} onChange={(e) => setLesson(i, { body: e.target.value })} />
          </div>
        ))}
        <Button variant="ghost" onClick={() => set({ lessons: [...d.lessons, { title: "", minutes: 10, body: "" }] })}><Plus size={14} />درس</Button>
      </div>
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
    </Modal>
  );
}

function Board() {
  const q = useQuery(crm.adminCourses, []);
  const [edit, setEdit] = useState<Draft | null>(null);
  return (
    <>
      <PageTitle title="دوره‌های آکادمی" sub="کاتالوگ آموزشی که برای همه‌ی سالن‌ها نمایش داده می‌شود" actions={<Button onClick={() => setEdit(blank())}><Plus size={14} />دوره‌ی جدید</Button>} />
      <Card className="p-5">
        <CardHead title="دوره‌ها" />
        {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <p className="text-sm text-ink3">دوره‌ای ثبت نشده است.</p> : (
          <ul className="divide-y divide-line text-sm">
            {q.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 flex-1 basis-48"><b>{c.title}</b><span className="block text-xs text-ink3">{faNum(c.lessons.length)} درس · {faNum(c.enrollments)} ثبت‌نام · {c.price ? toman(c.price) : "رایگان"}</span></span>
                <Badge tone={c.published ? "sage" : "neutral"}>{c.published ? "منتشرشده" : "پیش‌نویس"}</Badge>
                <Button variant="ghost" onClick={() => setEdit({ ...c, plans: c.inPlans.join(", ") })}>ویرایش</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {edit && <Editor d={edit} onClose={() => setEdit(null)} onSaved={() => void q.reload()} />}
    </>
  );
}

export default function AdminCourses() { return <AdminGate><Board /></AdminGate>; }
