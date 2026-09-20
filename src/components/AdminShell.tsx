"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "clsx";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { actions, useDB } from "@/lib/db";
import { BadgePercent, Bell, Blocks, MessageSquareText, Building2, Boxes, FileText, LifeBuoy, ShieldCheck, LogOut, Coins, GraduationCap, LayoutDashboard, Menu, Package, Receipt, Store, Tags, Users, X } from "lucide-react";

const groups = [
  { title: "", items: [{ href: "/admin", label: "نمای کلی", icon: LayoutDashboard }] },
  { title: "مشتریان پلتفرم", items: [
    { href: "/admin/tenants", label: "تننت‌ها (سالن‌ها)", icon: Building2 },
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
      <aside className="hidden w-64 shrink-0 bg-plum p-4 text-white lg:block">
        <div className="mb-6 flex items-center gap-2 px-2 py-3"><Store size={20} className="text-gold" /><div className="leading-tight"><p className="font-extrabold">پنل ادمین اکسیر</p><p className="text-[11px] text-white/50">پلتفرم، فروشگاه و پورسانت‌ها</p></div></div>
        {links}
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="truncate px-3 text-xs text-white/50">{db.session?.role === "admin" ? db.session.name : "وارد نشده‌اید"}</p>
          <button onClick={() => { actions.logout(); router.push("/login"); }} className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10"><LogOut size={16} />{db.session ? "خروج" : "ورود"}</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="bg-plum px-4 py-3 text-white lg:hidden">
          <div className="flex items-center justify-between">
            <p className="font-extrabold">پنل ادمین اکسیر</p>
            <button aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} onClick={() => setOpen(!open)} className="cursor-pointer rounded-lg bg-white/10 p-2">{open ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
          {open && <div className="mt-3 border-t border-white/10 pt-3">{links}<button onClick={() => { actions.logout(); router.push("/login"); }} className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/10"><LogOut size={16} />{db.session ? "خروج" : "ورود"}</button></div>}
        </header>
        <main className="mx-auto max-w-[1300px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
