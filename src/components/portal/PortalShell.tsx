"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { CalendarClock, Crown, Home, LogOut, Share2, Wallet } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useDB, type Customer } from "@/lib/db";
import { portal } from "@/lib/portal";
import { moduleActive } from "@/lib/modules";

const allNav = [
  { href: "/me", label: "خانه", icon: Home, mod: "" },
  { href: "/me/appointments", label: "نوبت‌ها", icon: CalendarClock, mod: "" },
  { href: "/me/rewards", label: "امتیازها", icon: Crown, mod: "loyalty" },
  { href: "/me/wallet", label: "کیف پول", icon: Wallet, mod: "loyalty" },
  { href: "/me/invite", label: "معرفی", icon: Share2, mod: "referral" },
];

export function useMe(): Customer | undefined {
  const db = useDB();
  return db.portal ? db.customers.find((c) => c.id === db.portal) : undefined;
}

export function PortalShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const db = useDB();
  const me = useMe();
  const isLogin = path.startsWith("/me/login");
  const nav = allNav.filter((n) => !n.mod || moduleActive(db, n.mod));
  const off = !moduleActive(db, "portal");

  useEffect(() => { if (!isLogin && !me) router.replace("/me/login"); }, [isLogin, me, router]);

  if (off) return <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center"><div><h1 className="text-lg font-extrabold">پنل مشتری فعال نیست</h1><p className="mt-2 text-sm leading-7 text-ink2">این سالن هنوز پنل مشتری را فعال نکرده است. برای رزرو نوبت از فرم آنلاین استفاده کنید.</p><a href="/book" className="mt-4 inline-block rounded-xl bg-rose px-5 py-2.5 text-[13px] font-bold text-white">رزرو نوبت</a></div></div>;
  if (isLogin) return <div className="mx-auto min-h-dvh max-w-md px-4 py-8">{children}</div>;
  if (!me) return <div className="min-h-screen" aria-busy="true" />;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-[calc(6rem+var(--safe-b))]">
      <header className="glass sticky top-0 z-20 flex items-center gap-2.5 border-b border-line/70 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
        <BrandMark size={38} />
        <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-sm font-extrabold">{db.salon.name}</p><p className="truncate text-[11px] text-ink3">{me.name}</p></div>
        <button aria-label="خروج" onClick={() => { portal.logout(); router.push("/me/login"); }} className="cursor-pointer rounded-lg p-2 text-ink3 hover:bg-surface2"><LogOut size={17} /></button>
      </header>
      <main className="space-y-4 px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 glass mx-auto grid max-w-md border-t border-line/70 pb-[var(--safe-b)]" aria-label="منوی اصلی" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map(({ href, label, icon: I }) => {
          const on = href === "/me" ? path === "/me" : path.startsWith(href);
          return <Link key={href} href={href} className={clsx("press flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold", on ? "text-rosedeep" : "text-ink3")}><span className={clsx("grid h-7 w-12 place-items-center rounded-full", on && "bg-rosesoft")}><I size={20} /></span>{label}</Link>;
        })}
      </nav>
    </div>
  );
}
