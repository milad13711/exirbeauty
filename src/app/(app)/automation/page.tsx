"use client";
import { useState } from "react";
import clsx from "clsx";
import { Gift, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, PageTitle, Toggle, Field, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { autoMeta, growth, matching } from "@/lib/growth";
import type { AutoKind, AutoRule } from "@/lib/seed-extra";
import { uid } from "@/lib/factories";
import { fa } from "@/lib/fa";

const blank = (): AutoRule => ({ id: uid("au"), kind: "inactive", days: 45, message: "{name} جان، دلمون برات تنگ شده 💗 برای رزرو نوبت اقدام کن.", gift: "", on: true, sent: 0, back: 0 });

export default function Automation() {
  const db = useDB();
  const [edit, setEdit] = useState<AutoRule | null>(null);
  const [ran, setRan] = useState<Record<string, number>>({});
  const [err, setErr] = useState("");
  const gain = db.automations.filter((r) => r.on).reduce((a, r) => a + r.back, 0);
  const set = (p: Partial<AutoRule>) => setEdit(edit && { ...edit, ...p });
  const isNew = edit && !db.automations.some((r) => r.id === edit.id);

  return (
    <>
      <PageTitle title="اتوماسیون بازگشت مشتری" sub="سیستم رفتار مشتری را می‌سنجد؛ مدیر سالن لازم نیست دستی پیگیری کند" actions={<Button onClick={() => { setEdit(blank()); setErr(""); }}><Plus size={14} />قانون جدید</Button>} />
      <Card className="mb-5 flex items-center gap-3 bg-sagesoft px-5 py-4"><Gift className="text-sage" /><p className="text-sm">این ماه اتوماسیون‌ها <b>{fa(gain)} مشتری</b> را به سالن برگردانده‌اند.</p></Card>

      {edit && (
        <Card className="mb-5">
          <form onSubmit={(e) => { e.preventDefault(); if (edit.message.trim().length < 10) return setErr("متن پیام را کامل بنویسید."); if (edit.kind !== "birthday" && edit.days < 0) return setErr("عدد نامعتبر است."); growth.saveRule({ ...edit, message: edit.message.trim() }); setEdit(null); setErr(""); }} className="grid gap-3 p-5 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">{isNew ? "قانون جدید" : "ویرایش قانون"}</h2>
            <Field label="اگر (رویداد)"><select value={edit.kind} onChange={(e) => set({ kind: e.target.value as AutoKind })} className={fieldCls}>{(Object.keys(autoMeta) as AutoKind[]).map((k) => <option key={k} value={k}>{autoMeta[k].label}</option>)}</select></Field>
            {edit.kind !== "birthday" && <Field label={autoMeta[edit.kind].unit}><input type="number" min={0} value={edit.days} onChange={(e) => set({ days: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>}
            <div className="sm:col-span-2"><Field label="آن‌گاه پیام بفرست ({name} = نام مشتری)"><textarea rows={3} value={edit.message} onChange={(e) => set({ message: e.target.value })} className={`${fieldCls} leading-7`} /></Field></div>
            <Field label="هدیه‌ی همراه (اختیاری)"><input value={edit.gift} onChange={(e) => set({ gift: e.target.value })} placeholder="مثلاً ۱۵٪ تخفیف" className={fieldCls} /></Field>
            <p className="self-end rounded-xl bg-surface2 p-3 text-sm text-ink2">مشمول الان: <b>{fa(matching(db, edit).length)} نفر</b></p>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
            <div className="flex gap-2 sm:col-span-2"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => { setEdit(null); setErr(""); }}>انصراف</Button></div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {db.automations.map((r) => {
          const m = autoMeta[r.kind]; const hits = matching(db, r);
          return (
            <Card key={r.id} className={clsx("p-4", !r.on && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-bold">{m.label}</p>
                  <p className="mt-0.5 text-sm text-ink2"><Badge>اگر</Badge> {m.when(r.days)} <Badge tone="rose">آن‌گاه</Badge> پیام{r.gift && ` + ${r.gift}`}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink3">{r.message}</p>
                </div>
                <div className="text-center text-xs text-ink3"><b className="block text-base text-ink">{fa(r.sent)}</b>ارسال</div>
                <div className="text-center text-xs text-ink3"><b className="block text-base text-sage">{fa(r.back)}</b>بازگشت</div>
                <Toggle on={r.on} label={`فعال‌سازی ${m.label}`} onChange={(v) => growth.saveRule({ ...r, on: v })} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <span className="text-xs text-ink2">مشمول الان: <b>{fa(hits.length)}</b>{hits.length > 0 && ` (${hits.slice(0, 2).map((c) => c.name.split(" ")[0]).join("، ")}${hits.length > 2 ? "…" : ""})`}</span>
                <span className="mr-auto flex gap-1.5">
                  <Button variant="soft" disabled={!hits.length || !r.on} onClick={() => setRan({ ...ran, [r.id]: growth.runRule(r.id) })}><Play size={13} />اجرا برای مشمولان</Button>
                  <Button variant="ghost" onClick={() => { setEdit({ ...r }); setErr(""); }}><Pencil size={13} />ویرایش</Button>
                  <button aria-label={`حذف ${m.label}`} onClick={() => growth.deleteRule(r.id)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
                </span>
                {ran[r.id] !== undefined && <span role="status" className="w-full text-xs font-semibold text-sage">پیام برای {fa(ran[r.id])} نفر ارسال شد.</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
