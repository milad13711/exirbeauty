"use client";
import { useState } from "react";
import clsx from "clsx";
import { Cake, Crown, MessageSquare, Send, UserX } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";
import { fa } from "@/lib/fa";

const tpls = [
  { k: "win", icon: UserX, t: "بازگشت مشتری", seg: "بیش از ۶۰ روز مراجعه نکرده‌اند", count: 23, msg: "دلتنگت شدیم ❤️ برای برگشت شما یک پیشنهاد ویژه داریم: ۱۵٪ تخفیف تا آخر هفته." },
  { k: "vip", icon: Crown, t: "ویژه VIP", seg: "مشتریان سطح VIP", count: 41, msg: "این پیشنهاد فقط برای مشتری‌های VIP ما فعال شده. یک ماسک مو هدیه بگیرید." },
  { k: "bday", icon: Cake, t: "تولد", seg: "متولدین این هفته (خودکار)", count: 6, msg: "تولدت مبارک 🎂 هدیه‌ی ما یک فیشال رایگان است." },
] as const;
const ch = ["پیامک", "واتساپ", "اعلان اپ"];
const past = [["بازگشت تابستان", "پیامک", 84, 19, "۲۲ مرداد"], ["تخفیف کراتین", "واتساپ", 120, 31, "۵ مرداد"], ["هدیه مادر", "پیامک", 210, 52, "۱۵ اردیبهشت"]] as const;

export default function Campaigns() {
  const [k, setK] = useState<(typeof tpls)[number]["k"]>("win");
  const [c, setC] = useState(ch[0]);
  const t = tpls.find((x) => x.k === k)!;
  const [msg, setMsg] = useState<Record<string, string>>({});
  const text = msg[k] ?? t.msg;
  return (
    <>
      <PageTitle title="کمپین و بازاریابی" sub="بدون دانش بازاریابی: مخاطب را انتخاب کن، پیام آماده است، ارسال کن" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHead title="۱. مخاطب را انتخاب کنید" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
              {tpls.map((x) => { const I = x.icon; return (
                <button key={x.k} onClick={() => setK(x.k)} className={clsx("cursor-pointer rounded-xl border p-4 text-right", k === x.k ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                  <I size={20} className="text-rose" /><p className="mt-2 text-sm font-bold">{x.t}</p><p className="mt-1 text-xs text-ink2">{x.seg}</p><Badge tone="rose" className="mt-2">{fa(x.count)} نفر</Badge>
                </button>); })}
            </div>
          </Card>
          <Card>
            <CardHead title="۲. پیام و کانال" />
            <div className="space-y-3 px-5 pb-5">
              <textarea aria-label="متن پیام" value={text} onChange={(e) => setMsg({ ...msg, [k]: e.target.value })} rows={4} className="w-full rounded-xl border border-line p-3 text-sm leading-7 outline-none focus:border-rose" />
              <div className="flex flex-wrap gap-2">{ch.map((x) => <button key={x} onClick={() => setC(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", c === x ? "border-rose bg-rose text-white" : "border-line text-ink2")}>{x}</button>)}</div>
              <Button><Send size={14} />ارسال به {fa(t.count)} نفر</Button>
            </div>
          </Card>
          <Card>
            <CardHead title="کمپین‌های گذشته" />
            <ul className="divide-y divide-line">{past.map((p) => <li key={p[0]} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="flex-1 font-semibold">{p[0]} <span className="text-xs font-normal text-ink3">· {p[1]} · {p[4]}</span></span><span className="text-ink2">{fa(p[2])} ارسال</span><Badge tone="sage">{fa(p[3])} نوبت</Badge></li>)}</ul>
          </Card>
        </div>
        <Card className="h-fit lg:sticky lg:top-20">
          <CardHead title="پیش‌نمایش" action={<MessageSquare size={16} className="text-ink3" />} />
          <div className="px-5 pb-5"><div className="rounded-2xl rounded-br-sm bg-sagesoft p-4 text-sm leading-7">{text}<p className="mt-2 text-[11px] text-ink3">سالن رُز · {c}</p></div></div>
        </Card>
      </div>
    </>
  );
}
