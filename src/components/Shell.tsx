"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Bell, LogIn, LogOut, Menu, Search, Settings, X, Flower2 } from "lucide-react";
import { navGroups } from "./nav";
import { Avatar } from "./ui";
import { TODAY } from "@/lib/mock";
import { actions, useDB } from "@/lib/db";

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 place-items-center rounded-xl bg-rose text-white"><Flower2 size={20} /></span>
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold text-ink">اکسیر بیوتی</p>
          <p className="text-[11px] text-ink3">{db.salon.name} · {db.salon.city}</p>
        </div>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-3 pb-6">
        {navGroups.map((g) => (
          <div key={g.title} className="mb-4">
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-ink3">{g.title}</p>
            {g.items.map((it) => {
              const Icon = it.icon;
              const on = active(it.href) && !(it.n === 3 && path !== "/customers/c1") && !(it.n === 1 && path === "/customers/c1");
              return (
                <Link
                  key={it.n}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                    on ? "bg-rosesoft font-bold text-rosedeep" : "text-ink2 hover:bg-surface2",
                  )}
                >
                  <Icon size={17} />
                  <span className="flex-1">{it.label}</span>
                  {!it.ready && <span className="rounded-full bg-surface2 px-1.5 text-[10px] text-ink3">بعداً</span>}
                </Link>
              );
            })}
          </div>
        ))}
        <Link href="/settings" onClick={() => setOpen(false)} className={clsx("mt-2 flex items-center gap-2.5 rounded-xl border-t border-line px-3 py-2.5 text-[13px] transition-colors", path.startsWith("/settings") ? "bg-rosesoft font-bold text-rosedeep" : "text-ink2 hover:bg-surface2")}><Settings size={17} />تنظیمات سالن</Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-l border-line bg-surface lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="بستن منو" className="absolute inset-0 bg-plum/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 bg-surface shadow-xl">
            <button aria-label="بستن" className="absolute left-3 top-4 rounded-lg p-1.5 hover:bg-surface2" onClick={() => setOpen(false)}><X size={18} /></button>
            {nav}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur lg:px-8">
          <button aria-label="باز کردن منو" className="rounded-lg p-2 hover:bg-surface2 lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <label className="relative max-w-md flex-1">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" />
            <input placeholder="جستجوی مشتری، خدمت، نوبت…" className="w-full rounded-xl border border-line bg-surface py-2 pr-9 pl-3 text-sm outline-none placeholder:text-ink3 focus:border-rose" />
          </label>
          <span className="hidden text-xs text-ink2 md:block">{TODAY}</span>
          <button aria-label="اعلان‌ها" className="relative rounded-lg p-2 hover:bg-surface2">
            <Bell size={19} className="text-ink2" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose" />
          </button>
          <div className="relative">
            <button aria-label="منوی کاربر" aria-expanded={menu} onClick={() => setMenu(!menu)} className="cursor-pointer rounded-full"><Avatar name={db.session?.name ?? "مدیر سالن"} color="#3a2431" /></button>
            {menu && (
              <div className="absolute left-0 top-11 z-50 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
                <p className="truncate px-3 py-2 text-xs text-ink3">{db.session?.name ?? "وارد نشده‌اید"}</p>
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
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
          {!db.onboarded && (
            <Link href="/onboarding" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber/30 bg-ambersoft px-5 py-3 text-sm"><span>راه‌اندازی سالن هنوز کامل نشده است.</span><b className="text-amber">ادامه‌ی راه‌اندازی ←</b></Link>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
