"use client";
/* eslint-disable @next/next/no-img-element -- عکس‌ها data-URL محلی‌اند */
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Camera, Download, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { useDB, type Post } from "@/lib/db";
import { ops } from "@/lib/ops";
import { caption, tipTopics } from "@/lib/caption";
import { renderStory } from "@/lib/story";
import { thisMonth } from "@/lib/growth";
import { dayInfo } from "@/lib/dates";
import { uid } from "@/lib/factories";
import { fa } from "@/lib/fa";

const kinds: { k: Post["kind"]; l: string }[] = [{ k: "before-after", l: "عکس قبل/بعد" }, { k: "service", l: "معرفی خدمت" }, { k: "offer", l: "پیشنهاد ویژه" }, { k: "birthday", l: "تولد مشتریان" }, { k: "tips", l: "نکته‌ی آموزشی" }];
const tone = { "پیش‌نویس": "neutral", "زمان‌بندی‌شده": "sky", "منتشر شد": "sage" } as const;

export default function Content() {
  const db = useDB();
  const [kind, setKind] = useState<Post["kind"]>("before-after");
  const [entryKey, setEntryKey] = useState("");
  const [consent, setConsent] = useState(false);
  const [svcId, setSvcId] = useState(db.services[0]?.id ?? "");
  const [discount, setDiscount] = useState(10);
  const [until, setUntil] = useState(5);
  const [topic, setTopic] = useState(Object.keys(tipTopics)[0]);
  const [variant, setVariant] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [when, setWhen] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const photoEntries = useMemo(() => db.customers.flatMap((c) => c.log.filter((l) => l.before || l.after).map((l) => ({ key: `${c.id}:${l.id}`, label: `${l.s} · ${l.d} · ${l.by}`, l }))), [db.customers]);
  const entry = photoEntries.find((e) => e.key === entryKey) ?? photoEntries[0];
  const svc = db.services.find((s) => s.id === svcId);
  const staffName = kind === "before-after" ? entry?.l.by : svc && db.staff.find((m) => svc.staff.includes(m.id))?.name;
  const gen = caption(kind, { service: kind === "before-after" ? entry?.l.s : svc?.name, staff: staffName, discount, until: dayInfo(until).short, topic: kind === "birthday" ? thisMonth() : topic, salon: db.salon.name, price: svc ? `${(svc.price / 1000).toLocaleString("en-US")} هزار`.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]) : undefined }, variant);
  const cap = text ?? gen.text;
  const needConsent = kind === "before-after";
  const blocked = needConsent && (!entry || !consent);

  const build = (status: Post["status"], day: number): Post => ({ id: editId ?? uid("p"), kind, caption: cap, tags: gen.tags, day, status, before: kind === "before-after" ? entry?.l.before : undefined, after: kind === "before-after" ? entry?.l.after : undefined, service: kind === "before-after" ? entry?.l.s : svc?.name });
  const reset = () => { setText(null); setEditId(null); setConsent(false); setVariant(0); };
  const save = (status: Post["status"], day: number, note: string) => { if (blocked) return setMsg("برای انتشار عکس مشتری، تأیید رضایت او لازم است."); ops.savePost(build(status, day)); setMsg(note); reset(); };

  const download = async () => {
    if (blocked) return setMsg("برای استفاده از عکس مشتری، تأیید رضایت او لازم است.");
    setBusy(true);
    try { const b = await renderStory({ salon: db.salon.name, caption: cap.replace(/\n/g, " "), tags: gen.tags, before: kind === "before-after" ? entry?.l.before : undefined, after: kind === "before-after" ? entry?.l.after : undefined, cta: "برای رزرو نوبت، لینک پروفایل", kind }); const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = "story.png"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); setMsg("کارت استوری دانلود شد."); }
    catch { setMsg("ساخت تصویر ممکن نشد."); }
    setBusy(false);
  };
  const load = (p: Post) => { setKind(p.kind); setText(p.caption); setEditId(p.id); setMsg(null); };

  return (
    <>
      <PageTitle title="تولید محتوا" sub="کپشن و کارت استوری از داخل سیستم؛ انتشار عکس مشتری فقط با رضایت او" />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">{kinds.map((x) => <button key={x.k} role="tab" aria-selected={kind === x.k} onClick={() => { setKind(x.k); reset(); setMsg(null); }} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", kind === x.k ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{x.l}</button>)}</div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHead title={editId ? "ویرایش پست" : "پست جدید"} />
          <div className="space-y-3 px-5 pb-5">
            {kind === "before-after" && (photoEntries.length ? (
              <>
                <Field label="خدمتِ دارای عکس"><select value={entry?.key} onChange={(e) => { setEntryKey(e.target.value); setText(null); }} className={fieldCls}>{photoEntries.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}</select></Field>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line p-3 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-[#b4536f]" />رضایت مشتری برای انتشار این عکس‌ها گرفته شده است (نام مشتری نمایش داده نمی‌شود).</label>
              </>
            ) : <p className="rounded-xl bg-ambersoft p-3 text-sm text-amber"><Camera size={14} className="ml-1 inline" />هنوز عکسی ثبت نشده است. در پروفایل مشتری ← «سوابق خدمات» عکس قبل/بعد اضافه کنید.</p>)}
            {(kind === "service" || kind === "offer") && <Field label="خدمت"><select value={svcId} onChange={(e) => { setSvcId(e.target.value); setText(null); }} className={fieldCls}>{db.services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
            {kind === "offer" && <div className="grid grid-cols-2 gap-3"><Field label="تخفیف (٪)"><input type="number" min={1} max={60} value={discount} onChange={(e) => { setDiscount(Math.min(60, Math.max(1, +e.target.value || 1))); setText(null); }} className={fieldCls} /></Field><Field label="اعتبار تا"><select value={until} onChange={(e) => { setUntil(+e.target.value); setText(null); }} className={fieldCls}>{[2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{dayInfo(d).weekday} {dayInfo(d).short}</option>)}</select></Field></div>}
            {kind === "tips" && <Field label="موضوع"><select value={topic} onChange={(e) => { setTopic(e.target.value); setText(null); }} className={fieldCls}>{Object.keys(tipTopics).map((t) => <option key={t}>{t}</option>)}</select></Field>}
            {kind === "birthday" && <p className="rounded-xl bg-surface2 p-3 text-sm text-ink2">{fa(db.customers.filter((c) => c.birth.includes(thisMonth())).length)} مشتری این ماه ({thisMonth()}) تولد دارند. متن به‌صورت عمومی است و نام کسی ذکر نمی‌شود.</p>}
            <Field label="کپشن"><textarea rows={5} value={cap} onChange={(e) => setText(e.target.value)} className={`${fieldCls} leading-7`} /></Field>
            <p className="text-xs text-ink3">{gen.tags.join(" ")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => { setVariant(variant + 1); setText(null); }}><RefreshCw size={14} />کپشن دیگر</Button>
              <Button variant="ghost" onClick={download} disabled={busy}><Download size={14} />{busy ? "در حال ساخت…" : "دانلود کارت استوری"}</Button>
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
              <Button variant="soft" onClick={() => save("پیش‌نویس", 0, "به‌عنوان پیش‌نویس ذخیره شد.")}>ذخیره‌ی پیش‌نویس</Button>
              <Field label="زمان‌بندی"><select value={when} onChange={(e) => setWhen(+e.target.value)} className={`${fieldCls} !w-auto !py-2`}>{[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{dayInfo(d).weekday} {dayInfo(d).short}</option>)}</select></Field>
              <Button variant="ghost" onClick={() => save("زمان‌بندی‌شده", when || 1, "پست زمان‌بندی شد.")}>زمان‌بندی</Button>
              <Button onClick={() => save("منتشر شد", 0, "پست به‌عنوان منتشرشده ثبت شد.")}>انتشار (شبیه‌سازی)</Button>
            </div>
            {msg && <p role="status" className={clsx("rounded-xl p-2.5 text-sm", msg.includes("لازم") || msg.includes("ممکن نشد") ? "bg-dangersoft text-danger" : "bg-sagesoft text-sage")}>{msg}</p>}
          </div>
        </Card>

        <Card className="lg:sticky lg:top-20">
          <CardHead title="پیش‌نمایش استوری" />
          <div className="px-5 pb-5">
            <div className="relative mx-auto flex aspect-[9/16] max-w-[240px] flex-col overflow-hidden rounded-3xl p-4" style={{ background: "linear-gradient(150deg,#f7e4ea,#f6ecd6)" }}>
              <p className="text-[11px] font-extrabold text-rosedeep">{db.salon.name}</p>
              {kind === "before-after" && entry ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">{[entry.l.before, entry.l.after].map((src, i) => src ? <img key={i} src={src} alt={i ? "بعد" : "قبل"} className="aspect-[4/5] w-full rounded-lg object-cover" /> : <span key={i} className="aspect-[4/5] rounded-lg bg-white/50" />)}</div>
              ) : <div className="mt-6" />}
              <p className="mt-3 line-clamp-[9] whitespace-pre-line text-[11px] leading-5 text-ink">{cap}</p>
              <p className="mt-auto rounded-full bg-plum py-1.5 text-center text-[10px] font-bold text-white">برای رزرو نوبت، لینک پروفایل</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead title="تقویم محتوا" hint={`${fa(db.posts.length)} پست`} />
        <ul className="divide-y divide-line">
          {[...db.posts].sort((a, b) => b.day - a.day).map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 basis-56"><b className="block truncate">{p.caption.split("\n")[0]}</b><span className="text-xs text-ink3">{kinds.find((k) => k.k === p.kind)?.l} · {p.day === 0 ? "امروز" : dayInfo(p.day).short}</span></span>
              <Badge tone={tone[p.status]}>{p.status}</Badge>
              {p.status !== "منتشر شد" && <Button variant="ghost" onClick={() => ops.savePost({ ...p, status: "منتشر شد", day: 0 })}>انتشار</Button>}
              <Button variant="ghost" onClick={() => load(p)}>ویرایش</Button>
              <button aria-label="حذف پست" onClick={() => ops.deletePost(p.id)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
