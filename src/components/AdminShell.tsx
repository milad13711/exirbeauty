"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import clsx from "clsx";
import { Coins, LayoutDashboard, Receipt, Store, Users } from "lucide-react";

const nav = [
  { href: "/admin", label: "نمای کلی", icon: LayoutDashboard },
  { href: "/admin/orders", label: "سفارش‌ها", icon: Receipt },
  { href: "/admin/referrers", label: "سالن‌های معرف", icon: Users },
  { href: "/admin/commissions", label: "پورسانت‌ها", icon: Coins },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 bg-plum p-4 text-white lg:block">
        <div className="mb-6 flex items-center gap-2 px-2 py-3"><Store size={20} className="text-gold" /><div className="leading-tight"><p className="font-extrabold">پنل ادمین اکسیر</p><p className="text-[11px] text-white/50">فروشگاه و پورسانت‌ها</p></div></div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: I }) => (
            <Link key={href} href={href} className={clsx("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm", on(href) ? "bg-white/15 font-bold" : "text-white/70 hover:bg-white/10")}><I size={17} />{label}</Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="bg-plum px-4 py-3 text-white lg:hidden"><p className="font-extrabold">پنل ادمین اکسیر</p>
          <nav className="mt-3 grid grid-cols-4 gap-1.5">
            {nav.map(({ href, label, icon: I }) => (
              <Link key={href} href={href} className={clsx("flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] leading-tight", on(href) ? "bg-white/20 font-bold" : "bg-white/5 text-white/70")}><I size={16} />{label}</Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1300px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
