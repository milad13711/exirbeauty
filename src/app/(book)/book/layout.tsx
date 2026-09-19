import { Flower2 } from "lucide-react";

export default function BookLayout({ children }: LayoutProps<"/book">) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 lg:px-8">
          <span className="grid size-10 place-items-center rounded-xl bg-rose text-white"><Flower2 size={20} /></span>
          <div className="leading-tight"><p className="font-extrabold">سالن رُز</p><p className="text-xs text-ink3">رزرو نوبت آنلاین · تهران، ونک</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 lg:px-8">{children}</main>
      <footer className="pb-8 text-center text-xs text-ink3">قدرت گرفته از اکسیر بیوتی</footer>
    </div>
  );
}
