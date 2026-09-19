export type StoryOpts = { salon: string; caption: string; tags: string[]; before?: string; after?: string; cta: string; kind: string };

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

/** کارت استوری ۱۰۸۰×۱۹۲۰ (PNG) */
export async function renderStory(o: StoryOpts): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#f7e4ea"); g.addColorStop(1, "#f6ecd6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.beginPath(); ctx.arc(W - 120, 160, 260, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(140, H - 220, 320, 0, 7); ctx.fill();
  const font = (px: number, w = 600) => `${w} ${px}px "Vazirmatn Variable", "Vazirmatn", sans-serif`;
  try { await document.fonts.load(font(40)); } catch {}
  ctx.direction = "rtl"; ctx.textAlign = "right";

  ctx.fillStyle = "#8f3a55"; ctx.font = font(54, 800); ctx.fillText(o.salon, W - 90, 150);
  let y = 260;
  const imgs = [o.before, o.after].filter(Boolean) as string[];
  if (imgs.length) {
    const gap = 30, w = imgs.length === 2 ? (W - 180 - gap) / 2 : W - 180, h = w * 1.25;
    for (let i = 0; i < imgs.length; i++) {
      const im = await load(imgs[i]); const x = imgs.length === 2 ? W - 90 - w - i * (w + gap) : 90;
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 36); ctx.clip();
      const r = Math.max(w / im.width, h / im.height); ctx.drawImage(im, x + (w - im.width * r) / 2, y + (h - im.height * r) / 2, im.width * r, im.height * r); ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.beginPath(); ctx.roundRect(x + w - 150, y + h - 80, 120, 52, 26); ctx.fill();
      ctx.fillStyle = "#6b5b62"; ctx.font = font(30, 700); ctx.textAlign = "center"; ctx.fillText(imgs.length === 2 ? (i === 0 ? "قبل" : "بعد") : "نتیجه", x + w - 90, y + h - 43); ctx.textAlign = "right";
    }
    y += h + 90;
  } else y = 520;
  ctx.fillStyle = "#2b1f25"; ctx.font = font(52, 600);
  for (const line of wrap(ctx, o.caption, W - 180).slice(0, 9)) { ctx.fillText(line, W - 90, y); y += 92; }
  ctx.fillStyle = "#b4536f"; ctx.font = font(40, 600); y += 20;
  ctx.fillText(o.tags.slice(0, 5).join("  "), W - 90, y);
  ctx.fillStyle = "#3a2431"; ctx.beginPath(); ctx.roundRect(90, H - 260, W - 180, 130, 65); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = font(46, 700); ctx.textAlign = "center"; ctx.fillText(o.cta, W / 2, H - 178);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("render"))), "image/png"));
}
