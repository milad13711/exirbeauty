/** رنگ‌بندی و برند هر تننت: از یک رنگ اصلی، کل پالت (نوشته، پس‌زمینه، خط، گرادیان) ساخته می‌شود */
export type Brand = { logo?: string; appName?: string; appColor: string; portalSame: boolean; portalColor: string };
export const DEFAULT_COLOR = "#b5476b";
export const defaultBrand: Brand = { appColor: DEFAULT_COLOR, portalSame: true, portalColor: DEFAULT_COLOR };
export const presets = [
  { n: "رُز", c: "#b5476b" }, { n: "یاقوتی", c: "#b3263e" }, { n: "ارغوانی", c: "#7c4a9e" }, { n: "نیلی", c: "#3f5fa8" },
  { n: "فیروزه‌ای", c: "#1f8a8a" }, { n: "زمردی", c: "#2f8a63" }, { n: "کهربایی", c: "#b7791f" }, { n: "مرجانی", c: "#c2603a" }, { n: "زغالی", c: "#3b3b45" },
];

export function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m ? m[1] : DEFAULT_COLOR.slice(1);
  const r = parseInt(v.slice(0, 2), 16) / 255, g = parseInt(v.slice(2, 4), 16) / 255, b = parseInt(v.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round((h * 60 + 360) % 360);
  const l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, Math.round(s * 100), Math.round(l * 100)];
}
export const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s.trim());
const hsl = (h: number, s: number, l: number) => `hsl(${h} ${Math.max(0, Math.min(100, s))}% ${Math.max(0, Math.min(100, l))}%)`;

function lum(h: number, s: number, l: number) {
  const a = s / 100 * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => { const k = (n + h / 30) % 12; return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const c = [f(0), f(8), f(4)].map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** متغیرهای CSS تم؛ رنگ اصلی برای خوانایی متن سفید روی دکمه اگر روشن باشد تیره‌تر می‌شود */
export function palette(hex: string, dark = false): Record<string, string> {
  const [h, s0, l0] = hexToHsl(hex);
  const s = Math.max(28, Math.min(s0, 82));
  if (dark) {
    const l = Math.max(52, Math.min(l0 + 12, 64));
    return {
      "--rose": hsl(h, s, l), "--rose-deep": hsl(h, Math.min(s + 10, 90), 76), "--rose-soft": hsl(h, 32, 20),
      "--grad-rose": `linear-gradient(135deg, ${hsl(h, s, l - 4)} 0%, ${hsl(h, s, l - 16)} 100%)`,
      "--bg": hsl(h, 20, 8), "--surface": hsl(h, 17, 12), "--surface-2": hsl(h, 15, 16), "--line": hsl(h, 13, 23),
      "--ink": hsl(h, 25, 95), "--ink-2": hsl(h, 10, 74), "--ink-3": hsl(h, 8, 53),
      "--plum": hsl(h, 30, 6), "--grad-plum": `linear-gradient(150deg, ${hsl(h, 28, 20)} 0%, ${hsl(h, 32, 11)} 100%)`,
    };
  }
  let l = Math.max(24, Math.min(l0, 52));
  while (l > 24 && 1.05 / (lum(h, s, l) + 0.05) < 4.5) l -= 1;
  const soft = Math.min(s, 70);
  return {
    "--rose": hsl(h, s, l),
    "--rose-deep": hsl(h, s, Math.max(12, l - 11)),
    "--rose-soft": hsl(h, soft, 94),
    "--grad-rose": `linear-gradient(135deg, ${hsl(h, s, Math.min(l + 8, 60))} 0%, ${hsl(h, s, Math.max(12, l - 7))} 100%)`,
    "--bg": hsl(h, 32, 97),
    "--surface": hsl(h, 30, 99.5),
    "--surface-2": hsl(h, 26, 94),
    "--line": hsl(h, 22, 88),
    "--ink": hsl(h, 28, 12),
    "--ink-2": hsl(h, 10, 38),
    "--ink-3": hsl(h, 8, 62),
    "--plum": hsl(h, 34, 14),
    "--grad-plum": `linear-gradient(150deg, ${hsl(h, 30, 22)} 0%, ${hsl(h, 36, 11)} 100%)`,
  };
}

export const brandOf = (salon: { brand?: Brand }): Brand => ({ ...defaultBrand, ...salon.brand });
export const colorFor = (b: Brand, scope: "app" | "portal") => (scope === "portal" && !b.portalSame ? b.portalColor : b.appColor);

/** تصویر آیکون اپ (PNG) از لوگو یا حرف اول نام، روی رنگ برند */
export async function makeIcon(size: number, color: string, name: string, logo?: string, maskable = false): Promise<string> {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const [h, s, l] = hexToHsl(color);
  const grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, hsl(h, s, Math.min(l + 8, 60)));
  grad.addColorStop(1, hsl(h, s, Math.max(12, l - 8)));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const pad = maskable ? size * 0.2 : size * 0.16;
  if (logo) {
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img")); img.src = logo; });
      const box = size - pad * 2, r = Math.min(box / img.width, box / img.height);
      g.drawImage(img, (size - img.width * r) / 2, (size - img.height * r) / 2, img.width * r, img.height * r);
      return c.toDataURL("image/png");
    } catch { /* به حرف اول برمی‌گردیم */ }
  }
  g.fillStyle = "#fff";
  g.font = `800 ${size * 0.5}px Vazirmatn Variable, system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText([...name.trim()][0] ?? "س", size / 2, size / 2 + size * 0.03);
  return c.toDataURL("image/png");
}

/** کوچک‌کردن لوگوی آپلودشده تا حجم ذخیره‌سازی کم بماند */
export function readLogo(file: File): Promise<string> {
  return new Promise((res, rej) => {
    if (!file.type.startsWith("image/")) return rej(new Error("فایل باید تصویر باشد."));
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("خواندن فایل ممکن نشد."));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error("تصویر معتبر نیست."));
      img.onload = () => {
        const r = Math.min(1, 384 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/png"));
      };
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}
