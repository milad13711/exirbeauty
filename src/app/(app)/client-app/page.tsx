"use client";
import { useState } from "react";
import clsx from "clsx";
import { CalendarClock, Gift, Home, Share2, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { Badge, Card, PageTitle } from "@/components/ui";
import { fa, num, toman } from "@/lib/fa";

const tabs = [{ k: "home", l: "خانه", i: Home }, { k: "rewards", l: "امتیازها", i: Sparkles }, { k: "shop", l: "فروشگاه", i: ShoppingBag }, { k: "wallet", l: "کیف پول", i: Wallet }] as const;

export default function ClientApp() {
  const [t, setT] = useState<(typeof tabs)[number]["k"]>("home");
  return (
    <>
      <PageTitle title="پنل مشتری (Mini App)" sub="مشتری با CRM پیچیده روبه‌رو نمی‌شود؛ فقط یک وب‌اپ ساده" />
      <div className="grid items-start gap-8 lg:grid-cols-[380px_1fr]">
        <div className="mx-auto w-full max-w-[360px] rounded-[36px] border-[10px] border-plum bg-bg shadow-xl">
          <div className="flex h-[640px] flex-col overflow-hidden rounded-[26px]">
            <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
              {t === "home" && (<>
                <p className="text-lg font-extrabold">👩‍🦰 سلام سارا</p>
                <div className="rounded-2xl bg-rose p-4 text-white"><p className="text-xs text-white/70">نوبت بعدی شما</p><p className="mt-1 text-lg font-bold">شنبه، ساعت ۱۷:۳۰</p><p className="text-sm text-white/80">رنگ ریشه · مریم حسینی</p></div>
                <div className="grid grid-cols-2 gap-2">
                  {[["خدمات من", CalendarClock], ["سوابق خدمات", Sparkles], ["تخفیف‌های من", Gift], ["معرفی دوستان", Share2]].map(([l, I]) => { const Ic = I as typeof Gift; return <div key={l as string} className="rounded-xl border border-line bg-surface p-3 text-sm font-semibold"><Ic size={18} className="mb-1.5 text-rose" />{l as string}</div>; })}
                </div>
                <div className="rounded-2xl bg-goldsoft p-3 text-sm">💡 وقت ترمیم رنگ شما نزدیک شده. <b className="text-rosedeep">رزرو نوبت</b></div>
              </>)}
              {t === "rewards" && (<>
                <div className="rounded-2xl bg-plum p-4 text-white"><p className="text-xs text-white/60">مزایای من در این سالن</p><p className="mt-1 text-3xl font-extrabold">{num(2450)}</p><p className="text-xs text-white/70">امتیاز · سطح VIP</p><div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 w-[82%] rounded-full bg-gold" /></div><p className="mt-1 text-xs text-white/70">{fa(550)} امتیاز تا جایزه‌ی بعدی</p></div>
                <div className="rounded-xl border border-line bg-surface p-3 text-sm">تخفیف من: <b>۱۰٪</b></div>
                <div className="rounded-xl border border-line bg-surface p-3 text-sm">هدیه تولد: <b>یک فیشال</b></div>
              </>)}
              {t === "shop" && (<>
                <p className="font-bold">محصولات پیشنهادی برای شما</p>
                {["ماسک ترمیم رنگ", "شامپو ضدرنگ‌پریدگی", "سرم ویتامین C"].map((p) => <div key={p} className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-sm">{p}<span className="rounded-lg bg-rose px-2.5 py-1 text-xs font-bold text-white">خرید</span></div>)}
              </>)}
              {t === "wallet" && (<>
                <div className="rounded-2xl bg-sagesoft p-4"><p className="text-xs text-sage">اعتبار شما</p><p className="mt-1 text-2xl font-extrabold text-sage">{toman(150_000)}</p></div>
                {["امتیاز", "Cashback", "پاداش معرفی", "کارت هدیه"].map((x) => <div key={x} className="rounded-xl border border-line bg-surface p-3 text-sm">{x}</div>)}
              </>)}
            </div>
            <nav className="grid grid-cols-4 border-t border-line bg-surface">
              {tabs.map(({ k, l, i: I }) => <button key={k} onClick={() => setT(k)} aria-label={l} className={clsx("flex cursor-pointer flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", t === k ? "text-rose" : "text-ink3")}><I size={19} />{l}</button>)}
            </nav>
          </div>
        </div>
        <Card className="p-6"><h3 className="font-bold">اصول طراحی پنل مشتری</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink2"><li>• یک صفحه‌ی خانه با نوبت بعدی و یک پیشنهاد</li><li>• چهار تب پایین، بدون منوی پیچیده</li><li>• همه‌ی مزایا (امتیاز، اعتبار، هدیه) در یک نگاه</li><li>• خرید محصول و رزرو با کمترین لمس</li></ul>
          <div className="mt-4 flex gap-2"><Badge tone="sage">Web App / PWA</Badge><Badge tone="sky">بدون نصب</Badge></div></Card>
      </div>
    </>
  );
}
