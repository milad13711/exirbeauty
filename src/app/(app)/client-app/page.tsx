"use client";
import Link from "next/link";
import { ExternalLink, Smartphone } from "lucide-react";
import { Badge, Card, CardHead, LinkButton, PageTitle } from "@/components/ui";
import { LiveGate } from "@/components/live/LiveGate";
import { Spinner } from "@/components/live/ui";
import { InstallPrompt } from "@/components/InstallPrompt";
import { crm } from "@/lib/crmApi";
import { useEntitlements } from "@/lib/entitlements";
import { useQuery } from "@/lib/useQuery";

function Board() {
  const ent = useEntitlements();
  const t = useQuery(crm.tenant, []);
  if (!t.data) return <Spinner />;
  const on = ent.isActive("portal");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/me/login?salon=${t.data.slug}`;
  return (
    <>
      <PageTitle title="اپ مشتریان" sub="پنل مشتری با ورود پیامکی؛ مشتری آن را روی گوشی خودش نصب می‌کند" actions={<LinkButton href={`/me/login?salon=${t.data.slug}`} variant="soft"><ExternalLink size={15} />باز کردن صفحه‌ی ورود مشتری</LinkButton>} />
      <div className="grid max-w-3xl gap-5">
        <Card>
          <CardHead title="نصب برای مشتریان" hint="لینک را در پیامک، اینستاگرام یا با کد QR در سالن بدهید" action={<Badge tone={on ? "sage" : "amber"}>{on ? "فعال" : "ماژول غیرفعال"}</Badge>} />
          <div className="px-5 pb-5"><InstallPrompt link={link} /></div>
        </Card>
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold"><Smartphone size={17} className="text-rose" />چه چیزی مشتری می‌بیند</h3>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-ink2">
            <li>• نوبت‌های پیش‌رو و سابقه، با امکان لغو در مهلت رایگان (تنظیمات ← رزرو آنلاین)</li>
            <li>• امتیاز و سطح، جایزه‌های اعتباری، کیف پول و لینک معرفی دوستان (اگر ماژول‌هایش فعال باشد)</li>
            <li>• ورود با شماره‌ی موبایل و کد پیامکی مخصوص همین سالن؛ بدون رمز عبور</li>
            <li>• ثبت‌نام خودکار مشتری تازه با اولین ورود (و ثبت معرف از لینک دعوت)</li>
          </ul>
          <p className="mt-3 text-xs text-ink3">برای ظاهر رنگی و لوگوی سالن به <Link href="/settings" className="font-bold text-rose">تنظیمات</Link> مراجعه کنید (در حال حاضر نسخه‌ی نمایشی).</p>
        </Card>
      </div>
    </>
  );
}

export default function ClientApp() { return <LiveGate><Board /></LiveGate>; }
