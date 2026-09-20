"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDB } from "@/lib/db";
import { useDark } from "@/lib/mode";
import { brandOf, colorFor, DEFAULT_COLOR, makeIcon, palette } from "@/lib/theme";

type Scope = "app" | "portal" | null;
export const scopeOf = (path: string): Scope => {
  if (/^\/(admin|store|explore|login|signup)(\/|$)/.test(path)) return null;
  return /^\/(me|book)(\/|$)/.test(path) ? "portal" : "app";
};

// رویداد نصب اپ (Android/Chrome) برای دکمه‌ی «نصب»
type Deferred = Event & { prompt: () => Promise<void> };
export const installState: { ev: Deferred | null } = { ev: null };
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installState.ev = e as Deferred; window.dispatchEvent(new Event("exir-install")); });
}

function setLink(rel: string, href: string, extra: Record<string, string> = {}) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${extra.sizes ? `[sizes="${extra.sizes}"]` : ""}`);
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el); }
  Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
  el.href = href;
}
function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

/** رنگ و برند تننت را روی کل صفحه اعمال می‌کند و مانیفست نصب (PWA) را برای همان سالن/مشتری می‌سازد */
export function ThemeApplier() {
  const path = usePathname();
  const db = useDB();
  const scope = scopeOf(path);
  const dark = useDark();
  const b = brandOf(db.salon);
  const color = scope ? colorFor(b, scope) : DEFAULT_COLOR;
  const name = db.salon.name;
  const appName = (b.appName || name).trim();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    const vars = dark ? palette(color, true) : color.toLowerCase() === DEFAULT_COLOR ? {} : palette(color);
    const keys = ["--rose", "--rose-deep", "--rose-soft", "--grad-rose", "--bg", "--surface", "--surface-2", "--line", "--ink", "--ink-2", "--ink-3", "--plum", "--grad-plum"];
    keys.forEach((k) => root.style.removeProperty(k));
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    setMeta("theme-color", vars["--bg"] ?? "#fbf6f1");
  }, [color, dark]);

  useEffect(() => {
    if (!scope) return;
    let dead = false;
    let url = "";
    (async () => {
      try {
        const [i192, i512, iMask, apple] = await Promise.all([makeIcon(192, color, appName, b.logo), makeIcon(512, color, appName, b.logo), makeIcon(512, color, appName, b.logo, true), makeIcon(180, color, appName, b.logo)]);
        if (dead) return;
        const portal = scope === "portal";
        const origin = location.origin;
        const nm = portal ? name : appName;
        const manifest = {
          name: portal ? `${name} — پنل مشتری` : `${appName} — مدیریت سالن`, short_name: portal ? name : appName, lang: "fa", dir: "rtl",
          start_url: `${origin}${portal ? "/me" : "/"}`, scope: `${origin}${portal ? "/me" : "/"}`, id: `${origin}${portal ? "/me" : "/"}`,
          display: "standalone", orientation: "portrait", background_color: "#fbf6f1", theme_color: color,
          icons: [{ src: i192, sizes: "192x192", type: "image/png" }, { src: i512, sizes: "512x512", type: "image/png" }, { src: iMask, sizes: "512x512", type: "image/png", purpose: "maskable" }],
        };
        url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
        setLink("manifest", url);
        setLink("apple-touch-icon", apple, { sizes: "180x180" });
        setLink("icon", i192, { sizes: "192x192", type: "image/png" });
        setMeta("apple-mobile-web-app-capable", "yes");
        setMeta("mobile-web-app-capable", "yes");
        setMeta("apple-mobile-web-app-title", nm);
        setMeta("apple-mobile-web-app-status-bar-style", "default");
      } catch { /* نصب اپ اختیاری است */ }
    })();
    return () => { dead = true; if (url) setTimeout(() => URL.revokeObjectURL(url), 2000); };
  }, [scope, color, appName, name, b.logo]);

  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  return null;
}
