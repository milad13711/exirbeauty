"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { CalendarClock, Home, LogOut, Wallet } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { actions, useDB, type StaffMember } from "@/lib/db";

const nav = [{ href: "/my", label: "خانه", icon: Home }, { href: "/my/appointments", label: "نوبت‌ها", icon: CalendarClock }, { href: "/my/wallet", label: "کیف پول", icon: Wallet }];

export function useMeStaff(): StaffMember | undefined {
  const db = useDB();
  return db.session?.role === "staff" ? db.staff.find((s) => s.id === db.session?.staffId) : undefined;
}

/** پنل موبایلی هر متخصص: نوبت‌ها و کیف پول شخصی */
export function StaffShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const db = useDB();
  const me = useMeStaff();
  const isLogin = path.startsWith("/my/login");
  useEffect(() => { if (!isLogin && !me) router.replace("/my/login"); }, [isLogin, me, router]);

  if (isLogin) return <div className="mx-auto min-h-dvh max-w-md px-4 py-8">{children}</div>;
  if (!me) return <div className="min-h-dvh" aria-busy="true" />;
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(6rem+var(--safe-b))]">
      <header className="glass sticky top-0 z-20 flex items-center gap-2.5 border-b border-line/70 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
        <Link href="/my/profile" aria-label="پروفایل من" className="press shrink-0"><Avatar name={me.name} color={me.color} size={40} src={me.photo ?? ""} /></Link>
        <div className="min-w-0 flex-1 leading-tight"><p className="truncate text-sm font-extrabold">{db.salon.name}</p><p className="truncate text-[11px] text-ink3">{me.name} · {me.role}</p></div>
        <button aria-label="خروج" onClick={() => { actions.logout(); router.push("/my/login"); }} className="grid size-10 cursor-pointer place-items-center rounded-full text-ink3 hover:bg-surface2"><LogOut size={17} /></button>
      </header>
      <main className="page-in space-y-4 px-4 py-5" key={path}>{children}</main>
      <nav aria-label="منوی متخصص" className="glass fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-3 border-t border-line/70 pb-[var(--safe-b)]">
        {nav.map(({ href, label, icon: I }) => {
          const on = href === "/my" ? path === "/my" : path.startsWith(href);
          return <Link key={href} href={href} className={clsx("press flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-bold", on ? "text-rosedeep" : "text-ink3")}><span className={clsx("grid h-7 w-12 place-items-center rounded-full", on && "bg-rosesoft")}><I size={20} /></span>{label}</Link>;
        })}
      </nav>
    </div>
  );
}
