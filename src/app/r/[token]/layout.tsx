import { Flower2 } from "lucide-react";

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface"><div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3.5 font-extrabold"><span className="grid size-9 place-items-center rounded-xl bg-[image:var(--grad-rose)] text-white"><Flower2 size={18} /></span>نظرسنجی</div></header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
      <footer className="pb-8 text-center text-xs text-ink3">قدرت گرفته از اکسیر بیوتی</footer>
    </div>
  );
}
