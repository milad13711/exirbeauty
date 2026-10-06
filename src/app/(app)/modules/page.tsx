"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Blocks, Check, Lock } from "lucide-react";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { useDB } from "@/lib/db";
import { CORE_NAMES, MODULES, minPlanFor, moduleActive, moduleAvailable, moduleById, modulePrice, planLabel } from "@/lib/modules";
import { moduleActions } from "@/lib/moduleActions";
import { fa, short, toman } from "@/lib/fa";
import { useEntitlements } from "@/lib/entitlements";
import { LiveModules } from "@/components/live/LiveModules";
import { LiveGate } from "@/components/live/LiveGate";

function PrototypeModules() {
  const db = useDB();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const cats = [...new Set(MODULES.map((m) => m.cat))];
  const run = (r: { ok: boolean; msg: string }) => setMsg({ ok: r.ok, t: r.msg });
  const addonCost = db.modules.addons.reduce((a, id) => a + modulePrice(db, id), 0);
  const activeN = MODULES.filter((m) => moduleActive(db, m.id)).length;

  return (
    <>
      <PageTitle title="ماژول‌ها" sub={`پلن ${planLabel[db.sub.planId]} · ${fa(activeN)} از ${fa(MODULES.length)} ماژول فعال`} actions={<Link href="/settings" className="inline-flex items-center rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2">ارتقای پلن</Link>} />

      <Card className="mb-5 p-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Blocks size={16} className="text-rose" />هسته‌ی سالن (همیشه فعال)</p>
        <div className="flex flex-wrap gap-2">{CORE_NAMES.map((n) => <Badge key={n} tone="sage"><Check size={11} />{n}</Badge>)}</div>
      </Card>
      {db.modules.addons.length > 0 && <p className="mb-4 rounded-xl bg-goldsoft p-3 text-sm text-gold">ماژول‌های تکی شما: {db.modules.addons.map((id) => moduleById(id)?.name).join("، ")} · مجموع {toman(addonCost)} در ماه</p>}
      {msg && <p role="status" className={clsx("mb-4 rounded-xl p-3 text-sm", msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{msg.t}</p>}

      {cats.map((cat) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-3 text-sm font-extrabold text-ink2">{cat}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {MODULES.filter((m) => m.cat === cat).map((m) => {
              const avail = moduleAvailable(db, m.id), act = moduleActive(db, m.id);
              const need = (m.req ?? []).filter((r) => !moduleActive(db, r));
              const minP = minPlanFor(db, m.id), isAddon = db.modules.addons.includes(m.id);
              return (
                <Card key={m.id} className={clsx("flex flex-col p-4", !avail && "bg-surface2/50")}>
                  <div className="flex items-start justify-between gap-2"><h3 className="font-bold">{m.name}</h3>{act ? <Badge tone="sage">نصب‌شده</Badge> : avail ? <Badge tone="sky">در پلن شما</Badge> : <Badge tone="neutral"><Lock size={11} />{minP ? `از پلن ${planLabel[minP]}` : "جداگانه"}</Badge>}</div>
                  <p className="mt-1.5 flex-1 text-xs leading-6 text-ink2">{m.desc}</p>
                  {need.length > 0 && !act && avail && <p className="mt-2 text-[11px] text-amber">نیازمند: {need.map((r) => moduleById(r)?.name).join("، ")}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {act && (confirm === m.id ? (
                      <><Button variant="ghost" className="!text-danger" onClick={() => { run(moduleActions.uninstall(m.id)); setConfirm(null); }}>حذف نصب</Button><Button variant="ghost" onClick={() => setConfirm(null)}>انصراف</Button></>
                    ) : <>{m.routes[0] && <Link href={m.routes[0]} className="rounded-xl bg-rosesoft px-3.5 py-2 text-[13px] font-semibold text-rosedeep">باز کردن</Link>}{m.id !== "sms" && <Button variant="ghost" onClick={() => setConfirm(m.id)}>حذف نصب</Button>}</>)}
                    {!act && avail && <Button onClick={() => run(moduleActions.install(m.id))}>نصب</Button>}
                    {!avail && (
                      <>
                        <Button onClick={() => run(moduleActions.buyAddon(m.id, "wallet"))}>خرید تکی · {short(modulePrice(db, m.id))}/ماه</Button>
                        <span className="text-[11px] text-ink3">یا ارتقای پلن</span>
                      </>
                    )}
                    {isAddon && <Button variant="ghost" onClick={() => run((moduleActions.removeAddon(m.id), { ok: true, msg: "خرید تکی لغو شد." }))}>لغو خرید تکی</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

export default function ModulesPage() {
  const ent = useEntitlements();
  return ent.live ? <LiveGate><LiveModules /></LiveGate> : <PrototypeModules />;
}
