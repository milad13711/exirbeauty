"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "clsx";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useDB } from "@/lib/db";
import { ThemeToggle } from "./ThemeToggle";
import { BadgePercent, Bell, Blocks, MessageSquareText, Building2, Boxes, FileText, LifeBuoy, MapPin, ShieldCheck, LogOut, Coins, GraduationCap, LayoutDashboard, LayoutGrid, Package, Receipt, Store, Tags, Users, X } from "lucide-react";

const groups = [
  { title: "", items: [{ href: "/admin", label: "نمای کلی", icon: LayoutDashboard }] },
  { title: "مشتریان پلتفرم", items: [
    { href: "/admin/tenants", label: "تننت‌ها (سالن‌ها)", icon: Building2 },
    { href: "/admin/finder-listings", label: "ثبت‌نام‌های اکسیریاب", icon: MapPin },
    { href: "/admin/plans", label: "تعرفه پلن‌ها", icon: Tags },
    { href: "/admin/modules", label: "ماژول‌ها و دسترسی پلن‌ها", icon: Blocks },
    { href: "/admin/sms", label: "پیامک و درآمد", icon: MessageSquareText },
    { href: "/admin/courses", label: "دوره‌های آموزشی", icon: GraduationCap },
  ]},
  { title: "فروشگاه", items: [
    { href: "/admin/products", label: "محصولات", icon: Package },
    { href: "/admin/orders", label: "سفارش‌ها", icon: Receipt },
    { href: "/admin/warehouse", label: "انبار", icon: Boxes },
    { href: "/admin/purchases", label: "فاکتور خرید", icon: FileText },
    { href: "/admin/referrers", label: "سالن‌های معرف", icon: Users },
    { href: "/admin/commissions", label: "پورسانت‌ها", icon: Coins },
    { href: "/admin/referral-marketing", label: "ریفرال مارکتینگ", icon: BadgePercent },
  ]},
  { title: "مدیریت", items: [{ href: "/admin/tickets", label: "تیکت‌ها", icon: LifeBuoy }, { href: "/admin/notifications", label: "اعلان‌ها", icon: Bell }, { href: "/admin/users", label: "کاربران ادمین", icon: ShieldCheck }] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const unread = db.notifications.filter((n) => n.audience === "admin" && !n.read).length;
  const badge = (href: string) => (href === "/admin/notifications" && unread > 0 ? <span className="mr-auto rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">{unread}</span> : href === "/admin/tickets" && db.tickets.some((t) => t.status === "باز") ? <span className="mr-auto rounded-full bg-amber px-1.5 text-[10px] font-bold text-white">{db.tickets.filter((t) => t.status === "باز").length}</span> : null);
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  const links = (
    <nav className="space-y-4">
      {groups.map((g) => (
        <div key={g.title}>
          {g.title && <p className="px-3 pb-1 text-[11px] font-semibold text-white/40">{g.title}</p>}
          {g.items.map(({ href, label, icon: I }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={clsx("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm", on(href) ? "bg-white/15 font-bold" : "text-white/70 hover:bg-white/10")}><I size={17} />{label}{badge(href)}</Link>
          ))}
        </div>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 bg-[image:var(--grad-plum)] p-4 text-white lg:block">
        <div className="mb-6 flex items-center gap-2 px-2 py-3"><Store size={20} className="text-gold" /><div className="leading-tight"><p className="font-extrabold">پنل ادمین اکسیر</p><p className="text-[11px] text-white/50">پلتفرم، فروشگاه و پورسانت‌ها</p></div></div>
        {links}
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="mb-3 px-1"><ThemeToggle compact /></div>
          <p className="truncate px-3 text-xs text-white/50">{db.session?.role === "admin" ? db.session.name : "وارد نشده‌اید"}</p>
          <button onClick={() => { actions.logout(); router.push("/login"); }} className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10"><LogOut size={16} />{db.session ? "خروج" : "ورود"}</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-line/70 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] lg:hidden">
          <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-[image:var(--grad-plum)] text-[#e6c88e]"><Store size={17} /></span><div className="leading-tight"><p className="text-[14px] font-extrabold">پنل ادمین اکسیر</p><p className="text-[10.5px] text-ink3">{db.session?.role === "admin" ? db.session.name : "وارد نشده‌اید"}</p></div></div>
          <Link href="/admin/notifications" aria-label="اعلان‌ها" className="relative grid size-10 place-items-center rounded-full hover:bg-surface2"><Bell size={19} className="text-ink2" />{unread > 0 && <span className="absolute -left-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">{unread}</span>}</Link>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button aria-label="بستن" className="fade-in absolute inset-0 bg-plum/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <div className="sheet-in absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-bg shadow-[var(--shadow-pop)]">
              <div className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line" />
              <div className="flex items-center justify-between px-5 pt-3 pb-2"><p className="font-extrabold">همه‌ی بخش‌ها</p><button aria-label="بستن" className="grid size-10 cursor-pointer place-items-center rounded-full bg-surface2" onClick={() => setOpen(false)}><X size={18} /></button></div>
              <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-6">
                {groups.filter((g) => g.title).map((g) => (
                  <div key={g.title} className="mt-4">
                    <p className="px-1 pb-2 text-[11.5px] font-bold text-ink3">{g.title}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {g.items.map(({ href, label, icon: I }) => (
                        <Link key={href} href={href} onClick={() => setOpen(false)} className={clsx("press flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center", on(href) ? "bg-rosesoft text-rosedeep" : "bg-surface text-ink2 shadow-[var(--shadow-card)]")}>
                          <span className={clsx("grid size-10 place-items-center rounded-xl", on(href) ? "bg-[image:var(--grad-rose)] text-white" : "bg-surface2 text-rose")}><I size={19} /></span>
                          <span className="line-clamp-2 min-h-8 w-full text-[11px] font-semibold leading-4">{label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mt-5"><ThemeToggle compact /></div>
                <button onClick={() => { actions.logout(); router.push("/login"); }} className="mt-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-bold text-danger"><LogOut size={16} />{db.session ? "خروج" : "ورود"}</button>
              </div>
            </div>
          </div>
        )}
        <main className="mx-auto max-w-[1300px] px-4 pt-5 pb-[calc(6.5rem+var(--safe-b))] lg:px-8 lg:py-6"><div key={path} className="page-in">{children}</div></main>
        <nav aria-label="ناوبری ادمین" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-line/70 pb-[var(--safe-b)] lg:hidden">
          <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 py-1.5">
            {[{ h: "/admin", l: "نمای کلی", I: LayoutDashboard }, { h: "/admin/tenants", l: "سالن‌ها", I: Building2 }, { h: "/admin/orders", l: "سفارش‌ها", I: Receipt }, { h: "/admin/tickets", l: "تیکت‌ها", I: LifeBuoy }].map((t) => (
              <li key={t.h}><Link href={t.h} className={clsx("press flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[10.5px] font-bold", on(t.h) ? "text-rosedeep" : "text-ink3")}><span className={clsx("grid h-7 w-12 place-items-center rounded-full", on(t.h) && "bg-rosesoft")}><t.I size={20} /></span>{t.l}</Link></li>
            ))}
            <li><button onClick={() => setOpen(true)} className="press flex min-h-[52px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold text-ink3"><span className="grid h-7 w-12 place-items-center"><LayoutGrid size={20} /></span>بیشتر</button></li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
