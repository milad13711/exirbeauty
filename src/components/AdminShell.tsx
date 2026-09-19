"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "clsx";
import { useState } from "react";
import { BadgePercent, Building2, Boxes, FileText, Coins, GraduationCap, LayoutDashboard, Menu, Package, Receipt, Store, Tags, Users, X } from "lucide-react";

const groups = [
  { title: "", items: [{ href: "/admin", label: "نمای کلی", icon: LayoutDashboard }] },
  { title: "مشتریان پلتفرم", items: [
    { href: "/admin/tenants", label: "تننت‌ها (سالن‌ها)", icon: Building2 },
    { href: "/admin/plans", label: "تعرفه پلن‌ها", icon: Tags },
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
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  const links = (
    <nav className="space-y-4">
      {groups.map((g) => (
        <div key={g.title}>
          {g.title && <p className="px-3 pb-1 text-[11px] font-semibold text-white/40">{g.title}</p>}
          {g.items.map(({ href, label, icon: I }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={clsx("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm", on(href) ? "bg-white/15 font-bold" : "text-white/70 hover:bg-white/10")}><I size={17} />{label}</Link>
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
      </aside>
      <div className="min-w-0 flex-1">
        <header className="bg-plum px-4 py-3 text-white lg:hidden">
          <div className="flex items-center justify-between">
            <p className="font-extrabold">پنل ادمین اکسیر</p>
            <button aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} onClick={() => setOpen(!open)} className="cursor-pointer rounded-lg bg-white/10 p-2">{open ? <X size={18} /> : <Menu size={18} />}</button>
          </div>
          {open && <div className="mt-3 border-t border-white/10 pt-3">{links}</div>}
        </header>
        <main className="mx-auto max-w-[1300px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
