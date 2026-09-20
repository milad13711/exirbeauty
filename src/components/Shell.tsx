"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Bell, Blocks, CalendarDays, LayoutDashboard, LayoutGrid, LifeBuoy, LogIn, LogOut, Search, Settings, Users, X, Wallet } from "lucide-react";
import { navGroups } from "./nav";
import { moduleActive, moduleAvailable, moduleForPath, MODULES } from "@/lib/modules";
import { Avatar } from "./ui";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import { TODAY } from "@/lib/mock";
import { actions, useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { fa } from "@/lib/fa";
import { myAccount, smsActive, usage } from "@/lib/sms";
import { MessageSquareText } from "lucide-react";
import { dayInfo } from "@/lib/dates";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [find, setFind] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const moreCount = MODULES.filter((m) => moduleAvailable(db, m.id) && !db.modules.installed.includes(m.id)).length;
  const smsOn = smsActive(db);
  const acc = myAccount(db);
  const low = smsOn && acc.balance <= acc.autoRecharge.threshold;
  const blocked7 = db.smsLog.filter((m) => m.status === "مسدود" && m.day >= -6);
  const notifs = db.notifications.filter((n) => n.audience === "salon");
  const unread = notifs.filter((n) => !n.read).length;
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <BrandMark size={40} />
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold text-ink">اکسیر بیوتی</p>
          <p className="text-[11px] text-ink3">{db.salon.name} · {db.salon.city}</p>
        </div>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-6">
        {navGroups.map((g) => ({ ...g, items: g.items.filter((it) => { const m = moduleForPath(it.href); return !m || moduleActive(db, m.id); }) })).filter((g) => g.items.length).map((g) => (
          <div key={g.title} className="mb-4">
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-ink3">{g.title}</p>
            {g.items.map((it) => {
              const Icon = it.icon;
              const on = active(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
                    on ? "bg-rosesoft font-bold text-rosedeep" : "text-ink2 hover:bg-surface2",
                  )}
                >
                  <Icon size={17} />
                  <span className="flex-1">{it.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
        <Link href="/modules" onClick={() => setOpen(false)} className={clsx("mt-2 flex items-center gap-2.5 rounded-xl border-t border-line px-3 py-2.5 text-[13px] transition-colors", path.startsWith("/modules") ? "bg-rosesoft font-bold text-rosedeep" : "text-ink2 hover:bg-surface2")}><Blocks size={17} />ماژول‌ها{moreCount > 0 && <span className="mr-auto rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">{fa(moreCount)}</span>}</Link>
        <Link href="/support" onClick={() => setOpen(false)} className={clsx("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors", path.startsWith("/support") ? "bg-rosesoft font-bold text-rosedeep" : "text-ink2 hover:bg-surface2")}><LifeBuoy size={17} />پشتیبانی</Link>
        <Link href="/settings" onClick={() => setOpen(false)} className={clsx("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors", path.startsWith("/settings") ? "bg-rosesoft font-bold text-rosedeep" : "text-ink2 hover:bg-surface2")}><Settings size={17} />تنظیمات سالن</Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-line bg-surface lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="بستن" className="fade-in absolute inset-0 bg-plum/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="sheet-in absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-bg shadow-[var(--shadow-pop)]">
            <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line" />
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <div className="flex items-center gap-2.5">
                <Avatar name={db.session?.name ?? "مدیر سالن"} color="#2e1a27" size={40} />
                <div className="leading-tight"><p className="text-sm font-extrabold">{db.salon.name}</p><p className="text-[11px] text-ink3">{db.session?.name ?? "وارد نشده‌اید"}</p></div>
              </div>
              <button aria-label="بستن" className="grid size-10 cursor-pointer place-items-center rounded-full bg-surface2" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-6">
              {navGroups.map((g) => ({ ...g, items: g.items.filter((it) => { const m = moduleForPath(it.href); return !m || moduleActive(db, m.id); }) })).filter((g) => g.items.length).map((g) => (
                <div key={g.title} className="mt-4">
                  <p className="px-1 pb-2 text-[11.5px] font-bold text-ink3">{g.title}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {g.items.map((it) => { const Icon = it.icon; const on = active(it.href); return (
                      <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className={clsx("press flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center", on ? "bg-rosesoft text-rosedeep" : "bg-surface shadow-[var(--shadow-card)] text-ink2")}>
                        <span className={clsx("grid size-10 place-items-center rounded-xl", on ? "bg-[image:var(--grad-rose)] text-white" : "bg-surface2 text-rose")}><Icon size={19} /></span>
                        <span className="line-clamp-2 min-h-8 w-full text-[11px] font-semibold leading-4">{it.label}</span>
                      </Link>); })}
                  </div>
                </div>
              ))}
              <div className="mt-5 grid grid-cols-3 gap-2">
                <Link href="/modules" onClick={() => setOpen(false)} className="press relative flex flex-col items-center gap-1.5 rounded-2xl bg-[image:var(--grad-plum)] px-2 py-3.5 text-[11.5px] font-bold text-white"><Blocks size={19} className="text-[#e6c88e]" />ماژول‌ها{moreCount > 0 && <span className="absolute left-2 top-2 rounded-full bg-rose px-1.5 text-[10px]">{fa(moreCount)}</span>}</Link>
                <Link href="/support" onClick={() => setOpen(false)} className="press flex flex-col items-center gap-1.5 rounded-2xl bg-surface px-2 py-3.5 text-[11.5px] font-bold text-ink2 shadow-[var(--shadow-card)]"><LifeBuoy size={19} className="text-rose" />پشتیبانی</Link>
                <Link href="/settings" onClick={() => setOpen(false)} className="press flex flex-col items-center gap-1.5 rounded-2xl bg-surface px-2 py-3.5 text-[11.5px] font-bold text-ink2 shadow-[var(--shadow-card)]"><Settings size={19} className="text-rose" />تنظیمات</Link>
              </div>
              <div className="mt-4"><ThemeToggle compact /></div>
              {db.session && <button onClick={() => { actions.logout(); setOpen(false); router.push("/login"); }} className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-bold text-danger"><LogOut size={16} />خروج از حساب</button>}
            </div>
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-30 flex items-center gap-2.5 border-b border-line/70 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
            <BrandMark size={36} />
            <span className="min-w-0 leading-tight"><span className="block truncate text-[14px] font-extrabold">{db.salon.name}</span><span className="block text-[10.5px] text-ink3">اکسیر بیوتی</span></span>
          </Link>
          <label className="relative hidden max-w-md flex-1 lg:block">
            <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" />
            <input placeholder="جستجوی مشتری، خدمت، نوبت…" className="min-h-10 w-full rounded-2xl border border-line bg-surface py-2 pr-10 pl-3 text-sm outline-none placeholder:text-ink3 focus:border-rose" />
          </label>
          <span className="flex-1 lg:hidden" />
          <button aria-label="جستجو" className="grid size-10 cursor-pointer place-items-center rounded-full text-ink2 hover:bg-surface2 lg:hidden" onClick={() => setFind(!find)}><Search size={19} /></button>
          {smsOn && (
            <Link href="/sms" aria-label={`اعتبار پیامک: ${fa(acc.balance)}`} className={clsx("press flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold", acc.balance <= 0 ? "border-danger/40 bg-dangersoft text-danger" : low ? "border-amber/40 bg-ambersoft text-amber" : "border-line bg-surface text-ink2 hover:bg-surface2")}>
              <MessageSquareText size={15} /><span>{fa(acc.balance.toLocaleString("en-US").replace(/,/g, "٬"))}</span><span className="hidden font-medium sm:inline">پیامک</span>
            </Link>
          )}
          <span className="hidden text-xs text-ink2 md:block">{TODAY}</span>
          <div className="relative">
            <button aria-label={`اعلان‌ها${unread ? `، ${fa(unread)} خوانده‌نشده` : ""}`} aria-expanded={bell} onClick={() => { setBell(!bell); setMenu(false); }} className="relative grid size-10 cursor-pointer place-items-center rounded-full hover:bg-surface2">
              <Bell size={19} className="text-ink2" />
              {unread > 0 && <span className="absolute -left-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">{fa(unread)}</span>}
            </button>
            {bell && (
              <div className="absolute left-0 top-11 z-50 w-80 max-w-[85vw] rounded-2xl border border-line bg-surface shadow-lg">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5"><b className="text-sm">اعلان‌ها</b>{unread > 0 && <button onClick={() => ops.markAllRead("salon")} className="cursor-pointer text-xs font-semibold text-rose">همه خوانده شد</button>}</div>
                <ul className="max-h-80 overflow-y-auto">
                  {notifs.slice(0, 6).map((n) => <li key={n.id}><Link href={n.href} onClick={() => { ops.markRead(n.id); setBell(false); }} className="flex items-start gap-2.5 px-4 py-3 hover:bg-surface2"><span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : "bg-rose")} /><span className="min-w-0 flex-1"><b className="block text-[13px]">{n.title}</b><span className="line-clamp-2 text-xs text-ink2">{n.body}</span></span><span className="shrink-0 text-[10px] text-ink3">{n.day === 0 ? "امروز" : dayInfo(n.day).short}</span></Link></li>)}
                  {!notifs.length && <li className="px-4 py-8 text-center text-xs text-ink3">اعلانی وجود ندارد.</li>}
                </ul>
                <Link href="/notifications" onClick={() => setBell(false)} className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-rose">همه‌ی اعلان‌ها</Link>
              </div>
            )}
          </div>
          <div className="relative">
            <button aria-label="منوی کاربر" aria-expanded={menu} onClick={() => { setMenu(!menu); setBell(false); }} className="cursor-pointer rounded-full"><Avatar name={db.session?.name ?? "مدیر سالن"} color="#3a2431" /></button>
            {menu && (
              <div className="absolute left-0 top-11 z-50 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-ink3">{db.session?.name ?? "وارد نشده‌اید"}</p>
                <div className="px-1.5 pb-1.5"><ThemeToggle compact /></div>
                <Link href="/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><Settings size={15} />تنظیمات</Link>
                {db.session ? (
                  <button onClick={() => { actions.logout(); setMenu(false); router.push("/login"); }} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger hover:bg-dangersoft"><LogOut size={15} />خروج</button>
                ) : (
                  <Link href="/login" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface2"><LogIn size={15} />ورود</Link>
                )}
              </div>
            )}
          </div>
        </header>
        {find && (
          <div className="fade-in border-b border-line/70 bg-bg px-4 py-2.5 lg:hidden">
            <label className="relative block"><Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" /><input autoFocus placeholder="جستجوی مشتری، خدمت، نوبت…" className="min-h-11 w-full rounded-2xl border border-line bg-surface py-2 pr-10 pl-3 text-sm outline-none focus:border-rose" /></label>
          </div>
        )}
        <main className="mx-auto max-w-[1400px] px-4 pt-5 pb-[calc(6.5rem+var(--safe-b))] lg:px-8 lg:py-6">
          {low && !path.startsWith("/sms") && (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber/40 bg-ambersoft px-5 py-3.5 text-sm">
              <MessageSquareText className="text-amber" size={20} />
              <p className="min-w-0 flex-1 basis-56">{acc.balance <= 0 ? "اعتبار پیامک شما تمام شده است" : `اعتبار پیامک شما فقط ${fa(acc.balance)} است`}؛ یادآوری نوبت و پیام‌های خودکار متوقف می‌شوند.{blocked7.length > 0 && <> <b>{fa(blocked7.length)} پیام</b> در ۷ روز اخیر ارسال نشد.</>}</p>
              <Link href={`/sms?tab=charge&pkg=${usage(db).recommended.id}`} className="rounded-xl bg-[image:var(--grad-rose)] px-4 py-2 text-[13px] font-bold text-white press">شارژ سریع</Link>
            </div>
          )}
          {!db.onboarded && (
            <Link href="/onboarding" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber/30 bg-ambersoft px-5 py-3 text-sm"><span>راه‌اندازی سالن هنوز کامل نشده است.</span><b className="text-amber">ادامه‌ی راه‌اندازی ←</b></Link>
          )}
          <div key={path} className="page-in">{children}</div>
        </main>
        <nav aria-label="ناوبری اصلی" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-[var(--safe-b)] lg:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1.5 pb-1.5">
            {[{ h: "/", l: "خانه", I: LayoutDashboard }, { h: "/calendar", l: "تقویم", I: CalendarDays }, { h: "/cashier", l: "صندوق", I: Wallet }, { h: "/customers", l: "مشتریان", I: Users }].map((t) => {
              const on = active(t.h);
              return (
                <li key={t.h}><Link href={t.h} className={clsx("press flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-bold", on ? "text-rosedeep" : "text-ink3")}>
                  <span className={clsx("grid h-7 w-12 place-items-center rounded-full transition-colors", on && "bg-rosesoft")}><t.I size={20} strokeWidth={on ? 2.4 : 1.9} /></span>{t.l}
                </Link></li>
              );
            })}
            <li><button onClick={() => setOpen(true)} className="press flex min-h-[52px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-bold text-ink3"><span className="relative grid h-7 w-12 place-items-center"><LayoutGrid size={20} strokeWidth={1.9} />{moreCount > 0 && <span className="absolute right-2 top-0 size-2 rounded-full bg-rose" />}</span>بیشتر</button></li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
