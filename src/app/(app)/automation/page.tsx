"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { ChevronDown, Gift, MessageSquareText, Play, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { autoMeta, growth, matching } from "@/lib/growth";
import { myAccount, OPT_OUT, parts, preview, sms, stats } from "@/lib/sms";
import type { AutoKind, AutoRule } from "@/lib/seed-extra";
import { uid } from "@/lib/factories";
import { fa, num, short } from "@/lib/fa";

const vars = ["{name}", "{salon}", "{link}", "{time}", "{service}", "{gift}", "{debt}"];
const defaults: Record<AutoKind, string> = {
  reminder24: "{name} عزیز، یادآوری نوبت فردا ساعت {time} برای {service} در {salon}.", reminder2: "{name} جان، نوبت شما ساعت {time} است. منتظرتان هستیم 🌸", confirm: "{name} عزیز، نوبت {service} شما در {salon} ثبت شد ({time}).",
  thanks: "{name} جان، ممنون از حضورتان در {salon} 💛", inactive: "{name} جان، دلمون برات تنگ شده 💗 رزرو: {link}", cycle: "{name} عزیز، وقت ترمیم شما نزدیک شده است: {link}",
  afterPurchase: "{name} جان، برای حفظ نتیجه محصولات مراقبتی ما را ببینید: {link}", birthday: "تولدت مبارک {name} 🎂 هدیه‌ی ما: {gift}", winback: "{name} جان، {gift} برای بازگشت شما فعال شد: {link}",
  capacity: "{name} عزیز، فردا وقت خالی داریم و {gift}. رزرو: {link}", debt: "{name} عزیز، مبلغ {debt} تومان از خدمات قبلی باقی مانده است.", welcome: "{name} عزیز، به {salon} خوش آمدید 🌸 {link}", expiry: "{name} جان، عضویت شما رو به پایان است.",
};

export default function Automation() {
  const db = useDB();
  const acc = myAccount(db);
  const st = stats(db);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<AutoRule | null>(null);
  const [res, setRes] = useState<Record<string, string>>({});
  const [newKind, setNewKind] = useState<AutoKind>("capacity");
  const [err, setErr] = useState("");
  const queued = db.smsLog.filter((m) => m.status === "در انتظار تأیید").length;
  const cur = (r: AutoRule) => (draft?.id === r.id ? draft : r);
  const set = (p: Partial<AutoRule>) => draft && setDraft({ ...draft, ...p });

  const runText = (s: ReturnType<typeof sms.runRule>) => [s.sent && `${fa(s.sent)} پیام ارسال شد`, s.queued && `${fa(s.queued)} پیام منتظر تأیید شماست`, s.blocked && `${fa(s.blocked)} پیام به‌دلیل کمبود اعتبار مسدود شد`, s.capped && `${fa(s.capped)} مورد به‌خاطر سقف‌ها رد شد`, s.deferred && `${fa(s.deferred)} مورد خارج از ساعت مجاز است`].filter(Boolean).join(" · ") || "مشمولی برای ارسال نبود.";

  return (
    <>
      <PageTitle title="سناریوهای پیامکی خودکار" sub="هر سناریو را روشن کنید؛ پیام‌ها خودکار می‌روند، ولی سقف، ساعت مجاز و تأیید دستی در کنترل شماست" actions={<Link href="/sms" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2"><MessageSquareText size={14} />اعتبار: {num(acc.balance)} پیامک</Link>} />

      {acc.balance <= acc.autoRecharge.threshold && <Card className="mb-4 flex flex-wrap items-center gap-3 border-amber/40 bg-ambersoft px-5 py-3.5"><TriangleAlert className="text-amber" size={20} /><p className="min-w-0 flex-1 basis-56 text-sm">اعتبار پیامک شما کم است؛ سناریوهای فعال ممکن است متوقف شوند.</p><Link href="/sms?tab=charge" className="rounded-xl bg-rose px-4 py-2 text-[13px] font-bold text-white">شارژ همین حالا</Link></Card>}
      {queued > 0 && <Card className="mb-4 flex flex-wrap items-center gap-3 bg-skysoft px-5 py-3.5"><p className="min-w-0 flex-1 basis-56 text-sm"><b>{fa(queued)} پیام</b> منتظر تأیید شماست.</p><Link href="/sms?tab=log" className="text-[13px] font-bold text-sky">بررسی و تأیید ←</Link></Card>}

      <Card className="mb-5 flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-0 flex-1 basis-56 text-sm text-ink2">۳۰ روز اخیر: <b className="text-ink">{fa(st.sent)}</b> پیام · درآمد قابل‌انتساب <b className="text-sage">{short(st.revenue)}</b>{st.perSms > 0 && <> · هر پیامک ≈ <b className="text-ink">{short(st.perSms)}</b> تومان درآمد</>}</div>
        <Button onClick={() => { const s = sms.runAll(); setRes({ ...res, all: `${fa(s.rules)} سناریو اجرا شد: ${runText(s)}` }); }}><Play size={14} />اجرای همه‌ی سناریوهای فعال (امروز)</Button>
        {res.all && <p role="status" className="w-full rounded-xl bg-sagesoft p-2.5 text-xs text-sage">{res.all}</p>}
      </Card>

      <div className="space-y-3">
        {db.automations.map((r0) => {
          const r = cur(r0); const m = autoMeta[r.kind]; const hits = matching(db, r); const isOpen = open === r.id;
          const text = preview(db, r); const p = parts(text); const by = st.byScenario[r.kind];
          return (
            <Card key={r.id} className={clsx(!r.on && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex flex-wrap items-center gap-2 font-bold">{m.label}{m.promo ? <Badge tone="amber">تبلیغاتی</Badge> : <Badge tone="sky">خدماتی</Badge>}{r.approval && <Badge tone="rose">با تأیید شما</Badge>}</p>
                  <p className="mt-0.5 text-sm text-ink2"><Badge>اگر</Badge> {m.when(r.days)} <Badge tone="rose">آن‌گاه</Badge> پیامک{r.gift && ` + ${r.gift}`}</p>
                </div>
                <div className="text-center text-xs text-ink3"><b className="block text-base text-ink">{fa(r.sent)}</b>ارسال</div>
                <div className="text-center text-xs text-ink3"><b className="block text-base text-sage">{by?.attr ? short(by.attr) : "—"}</b>درآمد ۳۰ روز</div>
                <Toggle on={r0.on} label={`فعال‌سازی ${m.label}`} onChange={(v) => growth.saveRule({ ...r0, on: v })} />
                <button aria-label={isOpen ? "بستن تنظیمات" : "باز کردن تنظیمات"} aria-expanded={isOpen} onClick={() => { setOpen(isOpen ? null : r.id); setDraft(isOpen ? null : { ...r0 }); setErr(""); }} className="cursor-pointer rounded-lg p-2 hover:bg-surface2"><ChevronDown size={18} className={clsx("transition-transform", isOpen && "rotate-180")} /></button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-ink2">
                <span>مشمول الان: <b>{fa(hits.length)}</b>{hits.length > 0 && ` (${hits.slice(0, 2).map((t) => t.c.name.split(" ")[0]).join("، ")}${hits.length > 2 ? "…" : ""})`}</span>
                <span>هزینه‌ی هر اجرا ≈ <b>{fa(hits.length * p)}</b> پیامک</span>
                <span className="mr-auto flex gap-1.5">
                  <Button variant="soft" disabled={!hits.length || !r0.on} onClick={() => setRes({ ...res, [r.id]: runText(sms.runRule(r.id)) })}><Play size={13} />اجرا برای مشمولان</Button>
                </span>
                {res[r.id] && <span role="status" className="w-full font-semibold text-sage">{res[r.id]}</span>}
              </div>

              {isOpen && draft && (
                <div className="grid gap-4 border-t border-line bg-surface2/40 p-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="متن پیام">
                      <textarea aria-label="متن پیام" rows={4} value={draft.message} onChange={(e) => set({ message: e.target.value })} className={`${fieldCls} leading-7`} />
                    </Field>
                    <div className="flex flex-wrap gap-1.5">{vars.map((v) => <button key={v} type="button" onClick={() => set({ message: `${draft.message} ${v}` })} className="cursor-pointer rounded-full border border-line bg-surface px-2.5 py-0.5 font-mono text-[11px] text-ink2 hover:bg-rosesoft"><bdi dir="ltr">{v}</bdi></button>)}</div>
                    <p className={clsx("text-xs", p > 1 ? "text-amber" : "text-ink3")}>{fa([...preview(db, draft)].length)} کاراکتر · {fa(p)} بخش پیامک{p > 1 ? " (هزینه بیشتر؛ کوتاه‌تر بنویسید)" : ""}{m.promo && acc.optOut ? ` · شامل «${OPT_OUT.trim()}»` : ""}</p>
                    <div className="rounded-2xl rounded-br-sm bg-sagesoft p-3 text-sm leading-7"><p className="mb-1 text-[11px] text-ink3">پیش‌نمایش · از خط {acc.line.kind === "dedicated" && acc.line.status === "فعال" ? acc.line.number : "مشترک اکسیر"}</p>{preview(db, draft)}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {m.needsDays && <Field label={m.unit}><input type="number" min={0} value={draft.days} onChange={(e) => set({ days: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>}
                      <Field label="هدیه (اختیاری)"><input value={draft.gift} onChange={(e) => set({ gift: e.target.value })} className={fieldCls} /></Field>
                      <Field label="ارسال از ساعت"><select value={draft.window[0]} onChange={(e) => set({ window: [+e.target.value, draft.window[1]] })} className={fieldCls}>{Array.from({ length: 13 }, (_, i) => 8 + i).map((h) => <option key={h} value={h}>{fa(h)}:۰۰</option>)}</select></Field>
                      <Field label="تا ساعت"><select value={draft.window[1]} onChange={(e) => set({ window: [draft.window[0], +e.target.value] })} className={fieldCls}>{Array.from({ length: 13 }, (_, i) => 10 + i).map((h) => <option key={h} value={h}>{fa(h)}:۰۰</option>)}</select></Field>
                      <Field label="سقف ارسال در روز"><input type="number" min={1} value={draft.dailyCap} onChange={(e) => set({ dailyCap: Math.max(1, +e.target.value || 1) })} className={fieldCls} /></Field>
                      <Field label="حداکثر به هر مشتری (در ۳۰ روز)"><input type="number" min={1} value={draft.perCustomer30} onChange={(e) => set({ perCustomer30: Math.max(1, +e.target.value || 1) })} className={fieldCls} /></Field>
                    </div>
                    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3"><Toggle on={draft.approval} label="ارسال با تأیید من" onChange={(v) => set({ approval: v })} /><div><p className="text-sm font-semibold">ارسال با تأیید من</p><p className="text-xs text-ink3">پیام‌ها در صف می‌مانند و بعد از تأیید شما ارسال (و هزینه کسر) می‌شوند.</p></div></div>
                    {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => { if (draft.message.trim().length < 10) return setErr("متن پیام را کامل بنویسید."); if (draft.window[1] <= draft.window[0]) return setErr("ساعت پایان باید بعد از شروع باشد."); growth.saveRule({ ...draft, message: draft.message.trim() }); setOpen(null); setDraft(null); setErr(""); }}>ذخیره</Button>
                      <Button variant="ghost" onClick={() => { setOpen(null); setDraft(null); }}>انصراف</Button>
                      <button aria-label={`حذف ${m.label}`} onClick={() => growth.deleteRule(r.id)} className="mr-auto cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="mt-5 flex flex-wrap items-end gap-3 p-4">
        <Field label="افزودن سناریو از کتابخانه"><select value={newKind} onChange={(e) => setNewKind(e.target.value as AutoKind)} className={`${fieldCls} !w-64`}>{(Object.keys(autoMeta) as AutoKind[]).map((k) => <option key={k} value={k}>{autoMeta[k].label}</option>)}</select></Field>
        <Button variant="ghost" onClick={() => { const id = uid("au"); growth.saveRule({ id, kind: newKind, days: newKind === "inactive" ? 45 : newKind === "expiry" ? 7 : 3, message: defaults[newKind], gift: "", on: false, sent: 0, back: 0, window: [9, 21], dailyCap: 60, perCustomer30: 2, approval: false }); setOpen(id); }}><Plus size={14} />افزودن</Button>
        <p className="text-xs text-ink3"><Gift size={12} className="ml-1 inline" />سناریوی جدید خاموش ساخته می‌شود تا قبل از روشن کردن، متن و کنترل‌ها را تنظیم کنید.</p>
      </Card>
    </>
  );
}
