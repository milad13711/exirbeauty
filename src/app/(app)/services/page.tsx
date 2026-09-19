"use client";
import { useState } from "react";
import clsx from "clsx";
import { Clock, Package, Pencil, Percent, Plus, Tag, Trash2, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { catColor, type Category } from "@/lib/mock";
import { actions, useDB, type Service } from "@/lib/db";
import { newService } from "@/lib/factories";
import { fa, short, toman } from "@/lib/fa";

const cats: ("همه" | Category)[] = ["همه", "مو", "پوست", "ناخن", "آرایش"];
const catOpts: Category[] = ["مو", "پوست", "ناخن", "آرایش"];

export default function Services() {
  const db = useDB();
  const [cat, setCat] = useState<(typeof cats)[number]>("همه");
  const [selId, setSelId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Service | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState("");

  const rows = db.services.filter((s) => cat === "همه" || s.cat === cat);
  const sel = db.services.find((s) => s.id === selId) ?? rows[0] ?? null;
  const set = <K extends keyof Service>(k: K, v: Service[K]) => setEdit(edit && { ...edit, [k]: v });
  const isNew = edit && !db.services.some((s) => s.id === edit.id);
  const profit = (s: Service) => s.price - s.materialCost - (s.price * s.commission) / 100;

  const save = () => {
    if (!edit) return;
    if (edit.name.trim().length < 2) return setErr("نام خدمت را وارد کنید.");
    if (edit.price <= 0 || edit.min <= 0) return setErr("قیمت و مدت باید بیشتر از صفر باشد.");
    if (!edit.staff.length) return setErr("حداقل یک متخصص را برای این خدمت انتخاب کنید.");
    if (isNew && db.services.some((s) => s.name.trim() === edit.name.trim())) return setErr("خدمتی با این نام وجود دارد.");
    actions.saveService({ ...edit, name: edit.name.trim() });
    setSelId(edit.id); setEdit(null); setErr("");
  };

  return (
    <>
      <PageTitle title="منوی خدمات" sub="کاتالوگ خدمات سالن با قیمت، زمان، متخصص، مواد مصرفی و کمیسیون" actions={<Button onClick={() => { setEdit({ ...newService(), staff: db.staff.filter((s) => s.active).map((s) => s.id).slice(0, 1) }); setErr(""); }}><Plus size={14} />خدمت جدید</Button>} />

      {edit && (
        <Card className="mb-5">
          <CardHead title={isNew ? "خدمت جدید" : `ویرایش «${edit.name || "خدمت"}»`} />
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="نام خدمت"><input value={edit.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} /></Field>
            <Field label="دسته"><select value={edit.cat} onChange={(e) => set("cat", e.target.value as Category)} className={fieldCls}>{catOpts.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="قیمت (تومان)"><input type="number" min={0} step={10000} value={edit.price} onChange={(e) => set("price", +e.target.value || 0)} className={fieldCls} /></Field>
            <Field label="مدت (دقیقه)"><input type="number" min={15} step={15} value={edit.min} onChange={(e) => set("min", +e.target.value || 0)} className={fieldCls} /></Field>
            <Field label="کمیسیون متخصص (٪)"><input type="number" min={0} max={80} value={edit.commission} onChange={(e) => set("commission", Math.min(80, +e.target.value || 0))} className={fieldCls} /></Field>
            <Field label="هزینه‌ی مواد مصرفی (تومان)"><input type="number" min={0} step={10000} value={edit.materialCost} onChange={(e) => set("materialCost", +e.target.value || 0)} className={fieldCls} /></Field>
            <Field label="مواد مصرفی"><input value={edit.materials} onChange={(e) => set("materials", e.target.value)} placeholder="رنگ، اکسیدان، فویل" className={fieldCls} /></Field>
            <Field label="ظرفیت"><input value={edit.capacity} onChange={(e) => set("capacity", e.target.value)} className={fieldCls} /></Field>
            <Field label="تخفیف (اختیاری)"><input value={edit.discount ?? ""} onChange={(e) => set("discount", e.target.value || undefined)} placeholder="مثلاً ۱۰٪ اولین بار" className={fieldCls} /></Field>
            <Field label="پکیج مرتبط (اختیاری)"><input value={edit.pkg ?? ""} onChange={(e) => set("pkg", e.target.value || undefined)} className={fieldCls} /></Field>
            <fieldset className="sm:col-span-2 lg:col-span-2">
              <legend className="mb-1 text-xs font-semibold text-ink2">متخصص‌های قابل ارائه</legend>
              <div className="flex flex-wrap gap-2">
                {db.staff.filter((s) => s.active).map((s) => {
                  const on = edit.staff.includes(s.id);
                  return <label key={s.id} className={clsx("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm", on ? "border-rose bg-rosesoft" : "border-line")}><input type="checkbox" checked={on} onChange={() => set("staff", on ? edit.staff.filter((x) => x !== s.id) : [...edit.staff, s.id])} className="size-4 accent-[#b4536f]" />{s.name}</label>;
                })}
              </div>
            </fieldset>
            <div className="flex items-center gap-3"><Toggle on={edit.active} onChange={(v) => set("active", v)} label="فعال بودن خدمت" /><span className="text-sm">{edit.active ? "فعال (قابل رزرو)" : "غیرفعال"}</span></div>
            <p className="rounded-xl bg-sagesoft p-3 text-xs text-sage sm:col-span-2 lg:col-span-3">سود خالص هر بار ارائه: <b>{toman(Math.round(profit(edit)))}</b> (پس از مواد و کمیسیون)</p>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2 lg:col-span-3">{err}</p>}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => { setEdit(null); setErr(""); }}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {cats.map((c) => <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={clsx("cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold", cat === c ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{c}</button>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => {
            const cc = catColor[s.cat];
            return (
              <button key={s.id} onClick={() => { setSelId(s.id); setConfirmDel(false); }} className={clsx("cursor-pointer rounded-2xl border bg-surface p-4 text-right transition-shadow hover:shadow-md", sel?.id === s.id ? "border-rose ring-1 ring-rose" : "border-line", !s.active && "opacity-55")}>
                <div className="flex items-center justify-between"><Badge className={clsx(cc.bg, cc.fg)}>{s.cat}</Badge>{!s.active && <Badge>غیرفعال</Badge>}</div>
                <p className="mt-3 text-[15px] font-bold">{s.name}</p>
                <div className="mt-2 flex items-center justify-between text-sm"><span className="inline-flex items-center gap-1 text-ink2"><Clock size={13} />{fa(s.min)} دقیقه</span><b>{short(s.price)}</b></div>
                <div className="mt-3 flex -space-x-reverse -space-x-2">{s.staff.map((id) => { const p = db.staff.find((x) => x.id === id); return p ? <span key={id} className="rounded-full ring-2 ring-surface"><Avatar name={p.name} color={p.color} size={24} /></span> : null; })}</div>
              </button>
            );
          })}
          {!rows.length && <p className="col-span-full py-10 text-center text-sm text-ink3">خدمتی در این دسته وجود ندارد.</p>}
        </div>

        {sel && (
          <Card className="h-fit xl:sticky xl:top-20">
            <CardHead title={sel.name} hint={`${sel.cat} · ${fa(sel.min)} دقیقه`} action={<Badge tone={sel.active ? "sage" : "neutral"}>{sel.active ? "فعال" : "غیرفعال"}</Badge>} />
            <div className="space-y-4 px-5 pb-5 text-sm">
              <dl className="divide-y divide-line">
                {[["قیمت", short(sel.price)], ["ظرفیت", sel.capacity], ["کمیسیون متخصص", `${fa(sel.commission)}٪`]].map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-ink3">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
              </dl>
              <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink3"><Users size={13} />متخصص‌های قابل ارائه</p>
                <div className="flex flex-wrap gap-1.5">{sel.staff.map((id) => <Badge key={id}>{db.staff.find((x) => x.id === id)?.name ?? "—"}</Badge>)}</div></div>
              <div><p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink3"><Package size={13} />مواد مصرفی (هزینه {short(sel.materialCost)})</p><p className="text-ink2">{sel.materials || "—"}</p></div>
              {sel.discount && <p className="flex items-center gap-1.5"><Percent size={14} className="text-amber" /><Badge tone="amber">{sel.discount}</Badge></p>}
              {sel.pkg && <p className="flex items-center gap-1.5"><Tag size={14} className="text-gold" /><Badge tone="gold">{sel.pkg}</Badge></p>}
              <div className="rounded-xl bg-sagesoft p-3"><p className="text-xs text-sage">سود خالص هر بار ارائه (پس از مواد و کمیسیون)</p><p className="mt-0.5 text-lg font-extrabold text-sage">{short(profit(sel))} تومان</p></div>
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1" onClick={() => { setEdit({ ...sel }); setErr(""); }}><Pencil size={14} />ویرایش</Button>
                <Button variant="ghost" onClick={() => actions.saveService({ ...sel, active: !sel.active })}>{sel.active ? "غیرفعال‌سازی" : "فعال‌سازی"}</Button>
              </div>
              {confirmDel ? (
                <div className="space-y-2 rounded-xl bg-dangersoft p-3 text-xs text-danger"><p>این خدمت از منو حذف می‌شود (نوبت‌های ثبت‌شده باقی می‌مانند).</p><div className="flex gap-2"><Button className="!bg-danger" onClick={() => { actions.deleteService(sel.id); setSelId(null); setConfirmDel(false); }}>حذف قطعی</Button><Button variant="ghost" onClick={() => setConfirmDel(false)}>انصراف</Button></div></div>
              ) : <Button variant="ghost" className="w-full !text-danger" onClick={() => setConfirmDel(true)}><Trash2 size={14} />حذف خدمت</Button>}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
