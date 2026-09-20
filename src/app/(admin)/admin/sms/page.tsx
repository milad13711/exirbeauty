"use client";
import { useState } from "react";
import { Gift, MessageSquareText, Send } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { useDB } from "@/lib/db";
import { packageCredits, perSms, sms } from "@/lib/sms";
import { dayInfo } from "@/lib/dates";
import { fa, num, short, toman } from "@/lib/fa";

export default function AdminSms() {
  const db = useDB();
  const [pr, setPr] = useState(() => structuredClone(db.smsPricing));
  const [saved, setSaved] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const name = (id: string) => db.tenants.find((t) => t.id === id)?.name ?? id;

  const tx30 = db.smsTx.filter((x) => x.day >= -29 && (x.kind === "شارژ" || x.kind === "خرید خط"));
  const revenue = tx30.reduce((a, x) => a + x.amount, 0);
  const topups = db.smsTx.filter((x) => x.day >= -29 && x.kind === "شارژ");
  const sold30 = db.smsAccounts.reduce((a, x) => a + x.sent30, 0);
  const cost = sold30 * db.smsPricing.cost;
  const leads = db.smsAccounts.filter((a) => a.balance < 300 && db.tenants.find((t) => t.id === a.tenantId)?.status !== "تعلیق");
  const pending = db.smsAccounts.filter((a) => a.line.status === "در انتظار تأیید");
  const dedicated = db.smsAccounts.filter((a) => a.line.kind === "dedicated" && a.line.status === "فعال").length;
  const setP = (i: number, p: Partial<(typeof pr.packages)[number]>) => { setPr({ ...pr, packages: pr.packages.map((x, j) => (j === i ? { ...x, ...p } : x)) }); setSaved(false); };

  return (
    <>
      <PageTitle title="پیامک و درآمد" sub="فروش اعتبار و خط اختصاصی، سرنخ‌های شارژ و قیمت‌گذاری" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="درآمد پیامک ۳۰ روز" value={short(revenue)} sub={`${fa(topups.length)} شارژ · ${fa(tx30.length - topups.length)} خط`} tone="rose" icon={<MessageSquareText size={16} />} />
        <Stat label="پیامک ارسالی ۳۰ روز" value={num(sold30)} tone="sky" />
        <Stat label="حاشیه‌ی سود مصرف" value={short(sold30 * (db.smsPricing.sell - db.smsPricing.cost))} sub={`${fa(Math.round(((db.smsPricing.sell - db.smsPricing.cost) / db.smsPricing.sell) * 100))}٪ · هزینه ${short(cost)}`} tone="sage" />
        <Stat label="خط اختصاصی فعال" value={fa(dedicated)} sub={pending.length ? `${fa(pending.length)} در انتظار تأیید` : undefined} tone="gold" />
      </div>

      {pending.length > 0 && (
        <Card className="mt-5">
          <CardHead title="درخواست‌های خط اختصاصی" hint="مدارک را بررسی و تأیید یا رد کنید" />
          <ul className="divide-y divide-line">
            {pending.map((a) => (
              <li key={a.tenantId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-sm">
                <div className="min-w-0 flex-1 basis-56"><b>{name(a.tenantId)}</b> <bdi dir="ltr" className="font-mono text-rosedeep">{a.line.number}</bdi> <Badge tone="gold">{a.line.tier}</Badge><p className="mt-1 text-xs text-ink2">صاحب امتیاز: {a.line.kyc?.holder} · شناسه: <bdi dir="ltr">{a.line.kyc?.idNo}</bdi> · مدارک {a.line.kyc?.doc ? "بارگذاری شد" : "ندارد"} · {toman(a.line.price ?? 0)}</p></div>
                <Button onClick={() => sms.adminLine(a.tenantId, true)}>تأیید و فعال‌سازی</Button>
                <Button variant="ghost" className="!text-danger" onClick={() => sms.adminLine(a.tenantId, false, "مدارک ناقص بود؛ مبلغ به کیف پول برگشت")}>رد</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-5">
        <CardHead title="سرنخ‌های شارژ (اعتبار کم)" hint="سالن‌هایی که اعتبارشان زیر ۳۰۰ پیامک است" />
        <ul className="divide-y divide-line">
          {leads.map((a) => (
            <li key={a.tenantId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1 basis-40"><b>{name(a.tenantId)}</b><span className="block text-xs text-ink3">مصرف ۳۰ روز {num(a.sent30)} · آخرین شارژ {a.lastTopup === 0 ? "امروز" : dayInfo(a.lastTopup).short}</span></span>
              <Badge tone={a.balance === 0 ? "danger" : "amber"}>{num(a.balance)} پیامک</Badge>
              <Button variant="soft" onClick={() => { sms.nudge(a.tenantId); setSent(a.tenantId); }}><Send size={13} />{sent === a.tenantId ? "ارسال شد ✓" : "یادآوری شارژ"}</Button>
              <Button variant="ghost" onClick={() => sms.gift(a.tenantId, 200, "هدیه‌ی تشویقی ادمین")}><Gift size={13} />هدیه ۲۰۰ پیامک</Button>
            </li>
          ))}
          {!leads.length && <li className="px-5 py-8 text-center text-sm text-ink3">همه‌ی سالن‌ها اعتبار کافی دارند.</li>}
        </ul>
      </Card>

      <Card className="mt-5">
        <CardHead title="قیمت‌گذاری" hint="تغییرات فوراً در صفحه‌ی شارژ سالن‌ها اعمال می‌شود" />
        <div className="space-y-4 px-5 pb-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="قیمت فروش هر بخش (تومان)"><input type="number" min={1} value={pr.sell} onChange={(e) => { setPr({ ...pr, sell: +e.target.value || 0 }); setSaved(false); }} className={fieldCls} /></Field>
            <Field label="هزینه‌ی خرید از اپراتور"><input type="number" min={1} value={pr.cost} onChange={(e) => { setPr({ ...pr, cost: +e.target.value || 0 }); setSaved(false); }} className={fieldCls} /></Field>
            <Field label="اجاره‌ی پایه‌ی خط (سالانه)"><input type="number" min={0} step={100000} value={pr.lineBase} onChange={(e) => { setPr({ ...pr, lineBase: +e.target.value || 0 }); setSaved(false); }} className={fieldCls} /></Field>
            <div className="grid grid-cols-2 gap-2">{Object.keys(pr.tierPrices).map((t) => <Field key={t} label={`افزوده‌ی ${t}`}><input type="number" min={0} step={100000} value={pr.tierPrices[t]} onChange={(e) => { setPr({ ...pr, tierPrices: { ...pr.tierPrices, [t]: +e.target.value || 0 } }); setSaved(false); }} className={fieldCls} /></Field>)}</div>
          </div>
          <ul className="space-y-2">
            {pr.packages.map((p, i) => (
              <li key={p.id} className="grid grid-cols-3 items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label="تعداد"><input type="number" min={1} value={p.count} onChange={(e) => setP(i, { count: +e.target.value || 0 })} className={fieldCls} /></Field>
                <Field label="قیمت (تومان)"><input type="number" min={0} step={1000} value={p.price} onChange={(e) => setP(i, { price: +e.target.value || 0 })} className={fieldCls} /></Field>
                <Field label="هدیه (٪)"><input type="number" min={0} max={100} value={p.bonusPct} onChange={(e) => setP(i, { bonusPct: Math.min(100, +e.target.value || 0) })} className={fieldCls} /></Field>
                <p className="col-span-3 text-xs text-ink2 sm:col-span-1">هر پیامک ≈ <b>{fa(perSms({ ...p }))}</b> · حاشیه {fa(Math.round(((p.price - packageCredits(p) * pr.cost) / p.price) * 100))}٪</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3"><Button onClick={() => { sms.savePricing(pr); setSaved(true); }}>ذخیره‌ی قیمت‌ها</Button>{saved && <span role="status" className="text-xs font-bold text-sage">ذخیره شد ✓</span>}</div>
        </div>
      </Card>

      <Card className="mt-5">
        <CardHead title="حساب پیامک همه‌ی سالن‌ها" />
        <DataList rows={db.smsAccounts} id={(a) => a.tenantId} cols={[
          { h: "سالن", title: true, cell: (a) => name(a.tenantId) },
          { h: "اعتبار", cell: (a) => <b className={a.balance < 300 ? "text-danger" : ""}>{num(a.balance)}</b> },
          { h: "مصرف ۳۰ روز", cell: (a) => num(a.sent30) },
          { h: "خط", cell: (a) => <span><bdi dir="ltr" className="text-xs">{a.line.number}</bdi> <Badge tone={a.line.kind === "dedicated" ? (a.line.status === "فعال" ? "sage" : "amber") : "neutral"}>{a.line.kind === "dedicated" ? a.line.status : "مشترک"}</Badge></span> },
          { h: "شارژ خودکار", cell: (a) => (a.autoRecharge.on ? <Badge tone="sage">فعال</Badge> : <span className="text-ink3">—</span>) },
        ]} />
      </Card>
    </>
  );
}
