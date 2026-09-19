import Link from "next/link";
import { Flower2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rosesoft/60 to-bg">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/login" className="mb-6 flex items-center justify-center gap-2.5 font-extrabold"><span className="grid size-10 place-items-center rounded-xl bg-rose text-white"><Flower2 size={20} /></span><span className="text-lg">اکسیر بیوتی</span></Link>
        {children}
        <p className="mt-6 text-center text-xs text-ink3">نسخه‌ی نمایشی · هیچ داده‌ای به سرور ارسال نمی‌شود</p>
      </div>
    </div>
  );
}
