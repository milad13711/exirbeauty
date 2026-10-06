"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, fieldCls } from "@/components/ui";
import { LiveGate, canManage, useMe } from "@/components/live/LiveGate";
import { CustomerForm } from "@/components/live/CustomerForm";
import { ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { crm, type BeautyProfile } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const GENDER = { FEMALE: "زن", MALE: "مرد", OTHER: "سایر" } as const;
type Section = "hair" | "skin" | "nail";
const FIELDS: Record<Section, { title: string; items: [string, string][] }> = {
  hair: { title: "مو", items: [["current", "رنگ فعلی"], ["type", "نوع مو"], ["state", "وضعیت"], ["brand", "برند رنگ"], ["oxidant", "اکسیدان"], ["lastColor", "آخرین رنگ"], ["formula", "فرمول"]] },
  skin: { title: "پوست", items: [["type", "نوع پوست"], ["used", "محصولات مصرفی"], ["allergies", "حساسیت‌ها"]] },
  nail: { title: "ناخن", items: [["services", "خدمات معمول"], ["colors", "رنگ‌ها"], ["allergies", "حساسیت‌ها"]] },
};

function BeautyEditor({ initial, onSave, onClose }: { initial: BeautyProfile; onSave: (b: BeautyProfile) => Promise<void>; onClose: () => void }) {
  const [v, setV] = useState<BeautyProfile>(initial);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (s: Section, k: string, val: string) => setV((cur) => ({ ...cur, [s]: { ...(cur[s] as Record<string, unknown> | undefined), [k]: val } }));
  const get = (s: Section, k: string) => String(((v[s] as Record<string, unknown> | undefined)?.[k]) ?? "");
  async function save() { setBusy(true); setErr(""); try { await onSave(v); onClose(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <Modal title="ویرایش پرونده‌ی زیبایی" onClose={onClose} wide>
      <div className="space-y-5">
        {(Object.keys(FIELDS) as Section[]).map((s) => (
          <section key={s}>
            <h3 className="mb-2 text-sm font-bold text-ink">{FIELDS[s].title}</h3>
            <div className="grid gap-2.5 sm:grid-cols-2">{FIELDS[s].items.map(([k, l]) => <Field key={k} label={l}><input value={get(s, k)} onChange={(e) => set(s, k, e.target.value)} className={fieldCls} /></Field>)}</div>
          </section>
        ))}
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره"}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

function VisitForm({ onAdd, onClose }: { onAdd: (v: { at: string; service: string; staffName: string; price: number; note: string }) => Promise<void>; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [service, setService] = useState(""); const [staffName, setStaff] = useState(""); const [price, setPrice] = useState(""); const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    if (!service.trim()) return setErr("نام خدمت را وارد کنید.");
    setBusy(true); setErr("");
    try { await onAdd({ at: `${date}T12:00:00+03:30`, service: service.trim(), staffName: staffName.trim(), price: Math.max(0, Math.round(Number(price) || 0)), note: note.trim() }); onClose(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title="ثبت سابقه‌ی خدمت" onClose={onClose}>
      <div className="space-y-3">
        <Field label="تاریخ"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} /></Field>
        <Field label="خدمت"><input value={service} onChange={(e) => setService(e.target.value)} className={fieldCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="متخصص"><input value={staffName} onChange={(e) => setStaff(e.target.value)} className={fieldCls} /></Field>
          <Field label="مبلغ (تومان)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        </div>
        <Field label="یادداشت"><input value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy}>ثبت</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const me = useMe();
  const q = useQuery(() => crm.customer(id), [id]);
  const [edit, setEdit] = useState<"info" | "beauty" | "visit" | null>(null);
  const [err, setErr] = useState("");
  const c = q.data;

  if (q.loading && !c) return <Spinner />;
  if (!c) return <ErrorNote message={q.error ? errorText(q.error) : "مشتری پیدا نشد."} onRetry={q.reload} />;

  async function archive() {
    if (!confirm(`«${c!.name}» از لیست مشتریان حذف شود؟ سابقه‌ی او حفظ می‌شود.`)) return;
    try { await crm.archiveCustomer(id); router.push("/customers"); } catch (e) { setErr(errorText(e)); }
  }
  const beauty = c.beauty ?? {};

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />همه‌ی مشتری‌ها</Link>
      {err && <div className="mb-3"><ErrorNote message={err} /></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={c.name} size={64} />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold">{c.name}</h1>
                <p className="text-sm text-ink2"><bdi dir="ltr">{c.phone}</bdi> · {GENDER[c.gender]}{c.birthDate && <> · تولد {faDate.short(c.birthDate.slice(0, 10))}</>}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{c.tags.map((t) => <Badge key={t} tone="rose">{t}</Badge>)}{c.source && <Badge tone="neutral">{c.source}</Badge>}</div>
              </div>
              <div className="flex gap-2"><Button variant="ghost" onClick={() => setEdit("info")}><Pencil size={14} />ویرایش</Button>{canManage(me) && <Button variant="ghost" className="!text-danger" onClick={archive}><Trash2 size={14} />حذف</Button>}</div>
            </div>
            {c.note && <p className="mt-4 rounded-xl bg-surface2 p-3 text-sm leading-7 text-ink2">{c.note}</p>}
            {c.allergies.length > 0 && <p className="mt-3 rounded-xl bg-dangersoft p-3 text-sm text-danger">⚠️ حساسیت: {c.allergies.join("، ")}</p>}
            {c.occasions.length > 0 && <p className="mt-3 text-xs text-ink3">مناسبت‌ها: {c.occasions.join("، ")}</p>}
          </Card>

          <Card>
            <CardHead title="پرونده‌ی زیبایی" action={<Button variant="ghost" className="!min-h-9" onClick={() => setEdit("beauty")}><Pencil size={14} />ویرایش</Button>} />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
              {(Object.keys(FIELDS) as Section[]).map((s) => {
                const data = (beauty[s] ?? {}) as Record<string, unknown>;
                const rows = FIELDS[s].items.filter(([k]) => data[k]);
                return (
                  <div key={s}>
                    <h3 className="mb-1.5 text-xs font-bold text-ink3">{FIELDS[s].title}</h3>
                    {rows.length ? <dl className="space-y-1.5 text-sm">{rows.map(([k, l]) => <div key={k}><dt className="text-[11px] text-ink3">{l}</dt><dd>{String(data[k])}</dd></div>)}</dl> : <p className="text-xs text-ink3">ثبت نشده</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHead title="سابقه‌ی خدمات" hint={`${faNum(c.stats.visitCount)} مراجعه · ${toman(c.stats.totalSpent)}`} action={<Button variant="ghost" className="!min-h-9" onClick={() => setEdit("visit")}><Plus size={14} />ثبت سابقه</Button>} />
            {c.visits.length === 0 ? <p className="px-5 pb-5 text-sm text-ink3">هنوز سابقه‌ای ثبت نشده؛ با «انجام شد» زدن نوبت‌ها خودکار ثبت می‌شود.</p> : (
              <ul className="divide-y divide-line">
                {c.visits.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1"><b className="block">{v.service}</b><span className="text-xs text-ink3">{faDate.short(v.at.slice(0, 10))}{v.staffName && ` · ${v.staffName}`}{v.note && ` · ${v.note}`}</span></span>
                    <b>{toman(v.price)}</b>
                    {canManage(me) && <button aria-label="حذف سابقه" onClick={async () => { if (confirm("این سابقه حذف شود؟")) { try { await crm.deleteVisit(id, v.id); void q.reload(); } catch (e) { setErr(errorText(e)); } } }} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5 lg:sticky lg:top-24">
          <h3 className="mb-3 text-sm font-bold">خلاصه</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink3">تعداد مراجعه</dt><dd className="font-semibold">{faNum(c.stats.visitCount)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink3">مجموع پرداخت</dt><dd className="font-semibold">{toman(c.stats.totalSpent)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink3">آخرین مراجعه</dt><dd>{c.stats.lastVisitAt ? faDate.short(c.stats.lastVisitAt.slice(0, 10)) : "—"}</dd></div>
          </dl>
          <Link href={`/calendar?customer=${c.id}`} className="press mt-4 block rounded-[14px] bg-[image:var(--grad-rose)] py-2.5 text-center text-[13.5px] font-bold text-white">نوبت جدید برای {c.name.split(" ")[0]}</Link>
        </Card>
      </div>

      {edit === "info" && (
        <Modal title="ویرایش مشتری" onClose={() => setEdit(null)} wide>
          <CustomerForm submitLabel="ذخیره" initial={c} onCancel={() => setEdit(null)} onSubmit={async (b) => { await crm.updateCustomer(id, b); setEdit(null); await q.reload(); }} />
        </Modal>
      )}
      {edit === "beauty" && <BeautyEditor initial={beauty} onClose={() => setEdit(null)} onSave={async (b) => { await crm.updateCustomer(id, { beauty: b }); await q.reload(); }} />}
      {edit === "visit" && <VisitForm onClose={() => setEdit(null)} onAdd={async (v) => { await crm.addVisit(id, v); await q.reload(); }} />}
    </>
  );
}

export function Profile({ id }: { id: string }) {
  return <LiveGate><Detail id={id} /></LiveGate>;
}
