import Link from "next/link";
import { Flower2, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const perks = [{ i: Sparkles, t: "نوبت‌دهی هوشمند" }, { i: Smartphone, t: "ویژه‌ی گوشی" }, { i: ShieldCheck, t: "۷ روز رایگان" }];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-10">
      <div className="relative overflow-hidden bg-[image:var(--grad-plum)] px-4 pb-28 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] text-white">
        <span className="pointer-events-none absolute -left-16 -top-24 size-72 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.4),transparent_65%)]" aria-hidden />
        <span className="pointer-events-none absolute -bottom-28 -right-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(198,90,128,.5),transparent_65%)]" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <Link href="/login" className="flex items-center gap-2.5 font-extrabold"><span className="grid size-11 place-items-center rounded-2xl bg-[image:var(--grad-rose)] shadow-[0_10px_22px_-10px_rgba(0,0,0,.6)]"><Flower2 size={22} /></span><span className="text-lg">اکسیر بیوتی</span></Link>
            <ThemeToggle iconOnly />
          </div>
          <h1 className="mt-6 text-[22px] font-extrabold leading-[1.7]">سالن را با آرامش و لذت مدیریت کنید</h1>
          <ul className="mt-3 flex flex-wrap gap-2">{perks.map(({ i: I, t }) => <li key={t} className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur"><I size={13} className="text-[#e6c88e]" />{t}</li>)}</ul>
        </div>
      </div>
      <div className="page-in relative z-10 mx-auto -mt-20 max-w-2xl px-4">
        {children}
        <p className="mt-6 text-center text-xs text-ink3">نسخه‌ی نمایشی · هیچ داده‌ای به سرور ارسال نمی‌شود</p>
      </div>
    </div>
  );
}
