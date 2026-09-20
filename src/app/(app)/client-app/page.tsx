"use client";
import Link from "next/link";
import { ExternalLink, Palette, Smartphone } from "lucide-react";
import { Badge, Card, CardHead, LinkButton, PageTitle } from "@/components/ui";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useDB } from "@/lib/db";
import { moduleActive } from "@/lib/modules";

export default function ClientApp() {
  const db = useDB();
  const on = moduleActive(db, "portal");
  return (
    <>
      <PageTitle title="اپ مشتریان" sub="همین پنل واقعی مشتری با رنگ و لوگوی سالن شما؛ مشتری آن را روی گوشی خودش نصب می‌کند" actions={<><LinkButton href="/settings" variant="ghost"><Palette size={15} />رنگ و لوگو</LinkButton><LinkButton href="/me" variant="soft"><ExternalLink size={15} />باز کردن در صفحه‌ی جدید</LinkButton></>} />
      <div className="grid items-start gap-8 lg:grid-cols-[380px_1fr]">
        <div className="mx-auto w-full max-w-[360px] rounded-[40px] border-[10px] border-plum bg-plum shadow-[var(--shadow-pop)]">
          <iframe title="پیش‌نمایش زنده‌ی اپ مشتری" src="/me" className="block h-[640px] w-full rounded-[28px] border-0 bg-bg" />
        </div>
        <div className="space-y-5">
          <Card>
            <CardHead title="نصب برای مشتریان" hint="لینک را در پیامک، اینستاگرام یا با کد QR در سالن بدهید" action={<Badge tone={on ? "sage" : "amber"}>{on ? "فعال" : "ماژول غیرفعال"}</Badge>} />
            <div className="px-5 pb-5"><InstallPrompt link={typeof window !== "undefined" ? `${window.location.origin}/me` : "/me"} /></div>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold"><Smartphone size={17} className="text-rose" />چه چیزی مشتری می‌بیند</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-ink2">
              <li>• آیکون و نام سالن شما روی صفحه‌ی اصلی گوشی (نه نام اکسیر)</li>
              <li>• نوبت بعدی، امتیاز و سطح، کیف پول و کش‌بک، معرفی دوستان</li>
              <li>• رنگ‌ها از <Link href="/settings" className="font-bold text-rose">تنظیمات ← برند و ظاهر</Link> تغییر می‌کنند</li>
              <li>• ورود با شماره‌ی موبایل و کد تأیید؛ بدون رمز عبور</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
