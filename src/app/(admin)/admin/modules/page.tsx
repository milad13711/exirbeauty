"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Card, CardHead, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { MODULES, modulePrice, planLabel } from "@/lib/modules";
import { moduleActions } from "@/lib/moduleActions";
import { fa, short } from "@/lib/fa";

const plans = ["basic", "pro", "elite"] as const;

export default function AdminModules() {
  const db = useDB();
  const [saved, setSaved] = useState(false);
  const tenantsWith = (id: string) => db.tenants.filter((t) => t.status === "فعال" && (db.planModules[t.plan] ?? []).includes(id)).length;
  const addonRev = db.modules.addons.reduce((a, id) => a + modulePrice(db, id), 0);
  const cats = [...new Set(MODULES.map((m) => m.cat))];

  return (
    <>
      <PageTitle title="کاتالوگ ماژول‌ها و پلن‌ها" sub="هر ماژول را در هر پلن روشن/خاموش کنید؛ سالن‌ها می‌توانند ماژول‌های خارج از پلن را به‌صورت ماهانه بخرند" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ماژول‌ها" value={fa(MODULES.length)} tone="rose" />
        {plans.map((p) => <Stat key={p} label={`ماژول‌های ${planLabel[p]}`} value={fa((db.planModules[p] ?? []).length)} tone={p === "elite" ? "gold" : p === "pro" ? "sage" : "sky"} />)}
      </div>
      {addonRev > 0 && <p className="mt-4 rounded-xl bg-goldsoft p-3 text-sm text-gold">درآمد ماژول‌های تکیِ سالن نمونه: {short(addonRev)} تومان در ماه</p>}
      {saved && <p role="status" className="mt-4 text-sm font-bold text-sage">تغییرات فوراً اعمال شد ✓</p>}

      {cats.map((cat) => (
        <Card key={cat} className="mt-5">
          <CardHead title={cat} />
          <ul className="divide-y divide-line">
            {MODULES.filter((m) => m.cat === cat).map((m) => (
              <li key={m.id} className="grid gap-3 px-5 py-3.5 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div className="min-w-0"><p className="text-sm font-bold">{m.name}</p><p className="text-xs text-ink3">{m.desc}{m.req?.length ? ` · نیازمند ${m.req.join("، ")}` : ""}</p><Badge className="mt-1.5">{fa(tenantsWith(m.id))} تننت فعال با دسترسی</Badge></div>
                <div className="flex items-center gap-4">
                  {plans.map((p) => (
                    <label key={p} className="flex flex-col items-center gap-1 text-[11px] text-ink2">{planLabel[p]}<Toggle on={(db.planModules[p] ?? []).includes(m.id)} label={`${m.name} در پلن ${planLabel[p]}`} onChange={(v) => { moduleActions.setPlanModule(p, m.id, v); setSaved(true); }} /></label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs text-ink2">خرید تکی (تومان/ماه)
                  <input aria-label={`قیمت تکی ${m.name}`} type="number" min={0} step={10000} value={modulePrice(db, m.id)} onChange={(e) => { moduleActions.setModulePrice(m.id, +e.target.value || 0); setSaved(true); }} className={`${fieldCls} !w-28 !py-1.5`} />
                </label>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-ink3"><Check size={13} />هسته (نوبت‌دهی، خدمات، متخصص، پروفایل مشتری) همیشه در همه‌ی پلن‌هاست و قابل خاموش شدن نیست.</p>
    </>
  );
}
