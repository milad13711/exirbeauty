import Link from "next/link";
import { Flower2 } from "lucide-react";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 lg:px-8">
          <Link href="/explore" className="flex items-center gap-2 font-extrabold"><span className="grid size-9 place-items-center rounded-xl bg-rose text-white"><Flower2 size={18} /></span>اکسیر · یافتن متخصص زیبایی</Link>
          <Link href="/login" className="text-xs text-ink3 hover:text-ink">ورود سالن‌داران</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 lg:px-8">{children}</main>
      <footer className="pb-8 text-center text-xs text-ink3">مارکت‌پلیس متخصص‌های زیبایی اکسیر</footer>
    </div>
  );
}
