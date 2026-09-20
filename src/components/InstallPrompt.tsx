"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Copy, Download, Share } from "lucide-react";
import { Button } from "./ui";
import { installState } from "./ThemeApplier";

const subscribe = (cb: () => void) => { window.addEventListener("exir-install", cb); return () => window.removeEventListener("exir-install", cb); };
const noSub = () => () => {};

/** راهنما/دکمه‌ی نصب اپ روی صفحه‌ی اصلی گوشی؛ روی اندروید نصب مستقیم، روی آیفون راهنمای «افزودن به صفحه‌ی اصلی» */
export function InstallPrompt({ link }: { link?: string }) {
  const ev = useSyncExternalStore(subscribe, () => installState.ev, () => null);
  const standalone = useSyncExternalStore(noSub, () => window.matchMedia("(display-mode: standalone)").matches, () => false);
  const ios = useSyncExternalStore(noSub, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1800); return () => clearTimeout(t); }, [copied]);
  if (standalone) return <p className="text-sm font-semibold text-sage">✓ اپلیکیشن روی این دستگاه نصب شده است.</p>;
  return (
    <div className="space-y-3">
      {ev ? (
        <Button onClick={async () => { await ev.prompt(); installState.ev = null; window.dispatchEvent(new Event("exir-install")); }}><Download size={16} />نصب روی این گوشی</Button>
      ) : ios ? (
        <p className="flex items-start gap-2 text-sm leading-7 text-ink2"><Share size={16} className="mt-1.5 shrink-0 text-rose" />در Safari دکمه‌ی <b>اشتراک‌گذاری</b> را بزنید و «<b>Add to Home Screen</b>» را انتخاب کنید.</p>
      ) : (
        <p className="text-sm leading-7 text-ink2">در Chrome از منوی سه‌نقطه «<b>Install app</b>» یا «<b>Add to Home screen</b>» را بزنید.</p>
      )}
      {link && (
        <div className="flex items-center gap-2 rounded-2xl bg-surface2 p-2 pr-3">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-xs text-ink2">{link}</span>
          <button onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); }} className="press inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-surface px-3 text-xs font-bold text-rose"><Copy size={13} />{copied ? "کپی شد" : "کپی لینک"}</button>
        </div>
      )}
    </div>
  );
}
