"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { CalendarClock, Crown, Flower2, Home, LogOut, Share2, Wallet } from "lucide-react";
import { useDB, type Customer } from "@/lib/db";
import { portal } from "@/lib/portal";

const nav = [
  { href: "/me", label: "خانه", icon: Home },
  { href: "/me/appointments", label: "نوبت‌ها", icon: CalendarClock },
  { href: "/me/rewards", label: "امتیازها", icon: Crown },
  { href: "/me/wallet", label: "کیف پول", icon: Wallet },
  { href: "/me/invite", label: "معرفی", icon: Share2 },
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

  useEffect(() => { if (!isLogin && !me) router.replace("/me/login"); }, [isLogin, me, router]);

  if (isLogin) return <div className="mx-auto min-h-screen max-w-md px-4 py-8">{children}</div>;
  if (!me) return <div className="min-h-screen" aria-busy="true" />;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <span className="grid size-9 place-items-center rounded-xl bg-rose text-white"><Flower2 size={18} /></span>
        <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-sm font-extrabold">{db.salon.name}</p><p className="truncate text-[11px] text-ink3">{me.name}</p></div>
        <button aria-label="خروج" onClick={() => { portal.logout(); router.push("/me/login"); }} className="cursor-pointer rounded-lg p-2 text-ink3 hover:bg-surface2"><LogOut size={17} /></button>
      </header>
      <main className="space-y-4 px-4 py-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-5 border-t border-line bg-surface" aria-label="منوی اصلی">
        {nav.map(({ href, label, icon: I }) => {
          const on = href === "/me" ? path === "/me" : path.startsWith(href);
          return <Link key={href} href={href} className={clsx("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", on ? "text-rose" : "text-ink3")}><I size={20} />{label}</Link>;
        })}
      </nav>
    </div>
  );
}
