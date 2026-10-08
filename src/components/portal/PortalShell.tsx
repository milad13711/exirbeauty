"use client";
/* eslint-disable @next/next/no-img-element -- uploaded salon images are small and already resized */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { CalendarClock, Crown, Home, LogOut, Share2, Wallet } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BrandMark } from "@/components/BrandMark";
import { Spinner } from "@/components/live/ui";
import { ApiError } from "@/lib/api";
import { portal, type PortalMe } from "@/lib/portalApi";
import { useQuery } from "@/lib/useQuery";

const Ctx = createContext<PortalMe | null>(null);
/** The signed-in customer (only rendered inside the shell, which guarantees a session). */
export const useMe = () => { const m = useContext(Ctx); if (!m) throw new Error("useMe outside PortalShell"); return m; };

const nav = (f: PortalMe["features"]) => [
  { href: "/me", label: "خانه", icon: Home, on: true },
  { href: "/me/appointments", label: "نوبت‌ها", icon: CalendarClock, on: f.booking },
  { href: "/me/rewards", label: "امتیازها", icon: Crown, on: f.loyalty },
  { href: "/me/wallet", label: "کیف پول", icon: Wallet, on: f.loyalty },
  { href: "/me/invite", label: "معرفی", icon: Share2, on: f.referral },
].filter((n) => n.on);

export function PortalShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isLogin = path.startsWith("/me/login");
  const q = useQuery(() => (isLogin ? Promise.resolve(null) : portal.me()), [isLogin]);
  const unauthorized = q.error instanceof ApiError && (q.error.status === 401 || q.error.status === 403);
  useEffect(() => { if (!isLogin && unauthorized) router.replace("/me/login"); }, [isLogin, unauthorized, router]);

  if (isLogin) return <div className="mx-auto min-h-dvh max-w-md px-4 py-8">{children}</div>;
  if (unauthorized) return <Spinner label="در حال انتقال به صفحه ورود…" />;
  const me = q.data;
  if (!me) return <div className="min-h-screen" aria-busy="true">{q.error ? <p className="p-8 text-center text-sm text-ink2">ارتباط با سرور برقرار نشد.</p> : <Spinner />}</div>;
  const items = nav(me.features);

  return (
    <Ctx.Provider value={me}>
      <div className="mx-auto min-h-screen max-w-md bg-bg pb-[calc(6rem+var(--safe-b))]">
        <header className="glass sticky top-0 z-20 flex items-center gap-2.5 border-b border-line/70 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
          {me.salon.logoUrl ? <img src={me.salon.logoUrl} alt="" className="size-[38px] rounded-xl object-cover" /> : <BrandMark size={38} />}
          <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-sm font-extrabold">{me.salon.name}</p><p className="truncate text-[11px] text-ink3">{me.name}</p></div>
          <Link href="/me/profile" aria-label="پروفایل من" className="press shrink-0"><Avatar name={me.name} size={36} /></Link>
          <button aria-label="خروج" onClick={async () => { await portal.logout().catch(() => {}); router.push(`/me/login?salon=${me.salon.slug}`); }} className="cursor-pointer rounded-lg p-2 text-ink3 hover:bg-surface2"><LogOut size={17} /></button>
        </header>
        <main className="space-y-4 px-4 py-5">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-30 glass mx-auto grid max-w-md border-t border-line/70 pb-[var(--safe-b)]" aria-label="منوی اصلی" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map(({ href, label, icon: I }) => {
            const on = href === "/me" ? path === "/me" : path.startsWith(href);
            return <Link key={href} href={href} className={clsx("press flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold", on ? "text-rosedeep" : "text-ink3")}><span className={clsx("grid h-7 w-12 place-items-center rounded-full", on && "bg-rosesoft")}><I size={20} /></span>{label}</Link>;
          })}
        </nav>
      </div>
    </Ctx.Provider>
  );
}
