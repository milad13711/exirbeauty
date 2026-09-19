"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, MessageSquare, Send, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { audience } from "@/lib/growth";
import { growth } from "@/lib/growth";
import { dayInfo } from "@/lib/dates";
import type { Segment } from "@/lib/seed-extra";
import { fa, short } from "@/lib/fa";

const tiers = ["برنزی", "نقره‌ای", "طلایی", "VIP"];
const channels = ["پیامک", "واتساپ", "اعلان اپ"];
const tpls: { l: string; name: string; seg: Segment; msg: string }[] = [
  { l: "بازگشت مشتری", name: "بازگشت مشتریان", seg: { inactiveDays: 60 }, msg: "{name} جان، دلتنگت شدیم ❤️ برای برگشتت یک پیشنهاد ویژه داریم: ۱۵٪ تخفیف تا آخر هفته." },
  { l: "ویژه VIP", name: "پیشنهاد VIP", seg: { tiers: ["VIP"] }, msg: "{name} عزیز، این پیشنهاد فقط برای مشتریان VIP ما فعال شده. یک ماسک مو هدیه بگیرید." },
  { l: "تولدهای این ماه", name: "تبریک تولد", seg: { birthdayMonth: true }, msg: "تولدت مبارک {name} 🎂 هدیه‌ی ما یک فیشال رایگان است." },
];

export default function Campaigns() {
  const db = useDB();
  const [name, setName] = useState("");
  const [seg, setSeg] = useState<Segment>({});
  const [msg, setMsg] = useState("");
  const [channel, setChannel] = useState(channels[0]);
  const [when, setWhen] = useState(0);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const aud = useMemo(() => audience(db, seg), [db, seg]);
  const hasFilter = Object.values(seg).some((v) => v !== undefined && v !== false && !(Array.isArray(v) && !v.length));
  const preview = msg.replace(/\{name\}/g, aud[0]?.name.split(" ")[0] ?? "سارا");
  const svcNames = [...new Set(db.services.map((s) => s.name))];

  const send = () => {
    setOk(null);
    if (name.trim().length < 3) return setErr("نام کمپین را وارد کنید.");
    if (msg.trim().length < 10) return setErr("متن پیام را کامل بنویسید.");
    if (!hasFilter) return setErr("حداقل یک شرط برای انتخاب مخاطب تعیین کنید.");
    if (!aud.length) return setErr("هیچ مشتری با این شرایط پیدا نشد.");
    const c = growth.sendCampaign({ name: name.trim(), channel, message: msg.trim(), segment: seg, whenDay: when });
    setErr(""); setOk(`${c.status === "ارسال‌شده" ? "کمپین برای" : "کمپین زمان‌بندی شد برای"} ${fa(c.count)} نفر ثبت شد.`); setName(""); setMsg(""); setSeg({});
  };
  const segText = (s: Segment) => [s.inactiveDays !== undefined && `بیش از ${s.inactiveDays} روز غیبت`, s.tiers?.length && `سطح ${s.tiers.join("، ")}`, s.birthdayMonth && "تولد این ماه", s.minSpend && `خرید بیش از ${short(s.minSpend)}`, s.favService && `علاقه‌مند به ${s.favService}`].filter(Boolean).join(" · ") || "همه";

  return (
    <>
      <PageTitle title="کمپین و بازاریابی" sub="مخاطب را با شرط انتخاب کنید، پیام آماده است، ارسال کنید" />
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHead title="قالب‌های آماده" />
            <div className="flex flex-wrap gap-2 px-5 pb-5">{tpls.map((t) => <button key={t.l} onClick={() => { setName(t.name); setSeg(t.seg); setMsg(t.msg); setOk(null); }} className="cursor-pointer rounded-full border border-line px-3.5 py-1.5 text-[13px] font-semibold text-ink2 hover:bg-surface2">{t.l}</button>)}</div>
          </Card>
          <Card>
            <CardHead title="۱. مخاطبان" hint="شرط‌ها با هم ترکیب می‌شوند (و)" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <Field label="مراجعه نکرده‌اند بیش از (روز)"><input type="number" min={0} value={seg.inactiveDays ?? ""} onChange={(e) => setSeg({ ...seg, inactiveDays: e.target.value === "" ? undefined : Math.max(0, +e.target.value) })} placeholder="مثلاً ۶۰" className={fieldCls} /></Field>
              <Field label="حداقل مجموع خرید (تومان)"><input type="number" min={0} step={100000} value={seg.minSpend ?? ""} onChange={(e) => setSeg({ ...seg, minSpend: e.target.value === "" ? undefined : Math.max(0, +e.target.value) })} className={fieldCls} /></Field>
              <Field label="خدمت موردعلاقه"><select value={seg.favService ?? ""} onChange={(e) => setSeg({ ...seg, favService: e.target.value || undefined })} className={fieldCls}><option value="">همه</option>{svcNames.map((n) => <option key={n}>{n}</option>)}</select></Field>
              <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-line px-3 py-2.5 text-sm"><input type="checkbox" checked={!!seg.birthdayMonth} onChange={(e) => setSeg({ ...seg, birthdayMonth: e.target.checked || undefined })} className="size-4 accent-[#b4536f]" />متولدین این ماه</label>
              <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-xs font-semibold text-ink2">سطح باشگاه</legend><div className="flex flex-wrap gap-2">{tiers.map((t) => { const on = seg.tiers?.includes(t) ?? false; return <label key={t} className={clsx("flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm", on ? "border-rose bg-rosesoft" : "border-line")}><input type="checkbox" checked={on} onChange={() => { const cur = seg.tiers ?? []; const n = on ? cur.filter((x) => x !== t) : [...cur, t]; setSeg({ ...seg, tiers: n.length ? n : undefined }); }} className="size-4 accent-[#b4536f]" />{t}</label>; })}</div></fieldset>
              <p className="rounded-xl bg-sagesoft p-3 text-sm text-sage sm:col-span-2">{hasFilter ? <>مخاطبان: <b>{fa(aud.length)} نفر</b>{aud.length > 0 && <span className="text-ink2"> — {aud.slice(0, 3).map((c) => c.name).join("، ")}{aud.length > 3 ? " و …" : ""}</span>}</> : "برای دیدن تعداد مخاطب، حداقل یک شرط تعیین کنید."}</p>
            </div>
          </Card>
          <Card>
            <CardHead title="۲. پیام و ارسال" />
            <div className="space-y-3 px-5 pb-5">
              <Field label="نام کمپین"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
              <Field label="متن پیام ({name} با نام مشتری جایگزین می‌شود)"><textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} className={`${fieldCls} leading-7`} /></Field>
              <div className="flex flex-wrap gap-2">{channels.map((x) => <button key={x} onClick={() => setChannel(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", channel === x ? "border-rose bg-rose text-white" : "border-line text-ink2")}>{x}</button>)}</div>
              <Field label="زمان ارسال"><select value={when} onChange={(e) => setWhen(+e.target.value)} className={fieldCls}><option value={0}>همین حالا</option>{[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{dayInfo(d).weekday} {dayInfo(d).short}</option>)}</select></Field>
              {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
              {ok && <p role="status" className="rounded-xl bg-sagesoft p-2.5 text-sm text-sage">{ok}</p>}
              <Button onClick={send}><Send size={14} />{when > 0 ? "زمان‌بندی" : "ارسال"} به {fa(aud.length)} نفر</Button>
            </div>
          </Card>
          <Card>
            <CardHead title="کمپین‌های قبلی" />
            <ul className="divide-y divide-line">
              {db.campaigns.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-right" aria-expanded={openId === c.id}>
                    <span className="min-w-0 flex-1 basis-40"><b className="block text-sm">{c.name}</b><span className="text-xs text-ink3">{c.channel} · {c.whenDay ? dayInfo(c.whenDay).short : c.day === 0 ? "امروز" : dayInfo(c.day).short} · {segText(c.segment)}</span></span>
                    <Badge tone={c.status === "ارسال‌شده" ? "sage" : "sky"}>{c.status}</Badge><span className="text-xs text-ink2">{fa(c.count)} نفر</span><ChevronDown size={15} className={clsx("text-ink3 transition-transform", openId === c.id && "rotate-180")} />
                  </button>
                  {openId === c.id && <div className="space-y-2 border-t border-line bg-surface2/50 px-5 py-3 text-sm"><p className="leading-7">{c.message}</p>{c.ids.length > 0 && <p className="text-xs text-ink3">مخاطبان: {c.ids.map((id) => db.customers.find((x) => x.id === id)?.name).filter(Boolean).slice(0, 8).join("، ")}{c.ids.length > 8 ? " و …" : ""}</p>}<Button variant="ghost" className="!text-danger" onClick={() => growth.deleteCampaign(c.id)}><Trash2 size={13} />حذف از تاریخچه</Button></div>}
                </li>
              ))}
              {!db.campaigns.length && <li className="px-5 pb-6 text-center text-sm text-ink3">هنوز کمپینی ارسال نشده است.</li>}
            </ul>
          </Card>
        </div>
        <Card className="lg:sticky lg:top-20">
          <CardHead title="پیش‌نمایش" action={<MessageSquare size={16} className="text-ink3" />} />
          <div className="px-5 pb-5"><div className="min-h-24 rounded-2xl rounded-br-sm bg-sagesoft p-4 text-sm leading-7">{preview || <span className="text-ink3">متن پیام اینجا نمایش داده می‌شود…</span>}<p className="mt-2 text-[11px] text-ink3">{db.salon.name} · {channel}</p></div></div>
        </Card>
      </div>
    </>
  );
}
