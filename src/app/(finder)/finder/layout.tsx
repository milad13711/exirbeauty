import Link from "next/link";
import { MapPin } from "lucide-react";

export default function FinderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 lg:px-8">
          <Link href="/finder" className="flex items-center gap-2 font-extrabold">
            <span className="grid size-9 place-items-center rounded-xl bg-[image:var(--grad-rose)] text-white"><MapPin size={18} /></span>
            اکسیریاب
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/explore" className="text-ink3 hover:text-ink">مارکت‌پلیس متخصص‌ها</Link>
            <Link href="/login" className="text-ink3 hover:text-ink">ورود سالن‌داران</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      <footer className="pb-8 text-center text-xs text-ink3">اکسیریاب — پیدا کردن نزدیک‌ترین متخصص‌های زیبایی ایران روی نقشه</footer>
    </div>
  );
}
