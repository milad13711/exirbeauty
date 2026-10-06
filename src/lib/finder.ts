import { IRAN_CITY_DATA, IRAN_MAP_VIEWBOX, IRAN_PROVINCES } from "./iran-provinces";

export { IRAN_MAP_VIEWBOX, IRAN_PROVINCES };

export type FinderCat = "مو" | "پوست" | "ناخن" | "آرایش" | "ابرو و مژه" | "لیزر" | "اصلاح مردانه";

export const FINDER_CATS: FinderCat[] = ["مو", "پوست", "ناخن", "آرایش", "ابرو و مژه", "لیزر", "اصلاح مردانه"];

export const catStyle: Record<FinderCat, { bg: string; fg: string; dot: string }> = {
  "مو": { bg: "bg-rosesoft", fg: "text-rosedeep", dot: "#b5476b" },
  "پوست": { bg: "bg-sagesoft", fg: "text-sage", dot: "#4b8a70" },
  "ناخن": { bg: "bg-goldsoft", fg: "text-gold", dot: "#b98d3f" },
  "آرایش": { bg: "bg-skysoft", fg: "text-sky", dot: "#4a7fb0" },
  "ابرو و مژه": { bg: "bg-ambersoft", fg: "text-amber", dot: "#c07a1c" },
  "لیزر": { bg: "bg-dangersoft", fg: "text-danger", dot: "#bf433b" },
  "اصلاح مردانه": { bg: "bg-surface2", fg: "text-ink2", dot: "#6a5661" },
};

/** مختصات تقریبی مرکز هر شهر (برای محاسبه فاصله واقعی)؛ x/y روی نقشه از iran-provinces می‌آید. */
const CITY_LATLNG: Record<string, [number, number]> = {
  "تهران": [35.6892, 51.3890], "مشهد": [36.2605, 59.6168], "اصفهان": [32.6546, 51.6680], "شیراز": [29.5918, 52.5837],
  "تبریز": [38.0800, 46.2919], "اهواز": [31.3183, 48.6706], "کرج": [35.8400, 50.9391], "قم": [34.6416, 50.8746],
  "کرمانشاه": [34.3142, 47.0650], "ارومیه": [37.5527, 45.0761], "رشت": [37.2809, 49.5832], "یزد": [31.8974, 54.3569],
  "کرمان": [30.2839, 57.0834], "زاهدان": [29.4963, 60.8629], "بندرعباس": [27.1865, 56.2808], "ساری": [36.5633, 53.0601],
  "همدان": [34.7992, 48.5146], "اراک": [34.0917, 49.6892], "بوشهر": [28.9234, 50.8203], "گرگان": [36.8427, 54.4404],
  "زنجان": [36.6736, 48.4787], "قزوین": [36.2688, 50.0041], "خرم‌آباد": [33.4878, 48.3558], "سنندج": [35.3143, 46.9923],
  "ایلام": [33.6374, 46.4227], "بیرجند": [32.8663, 59.2211], "یاسوج": [30.6683, 51.5878], "شهرکرد": [32.3256, 50.8644],
  "بجنورد": [37.4747, 57.3291], "سمنان": [35.5769, 53.3960], "اردبیل": [38.2498, 48.2933],
};

export type CityGeo = { name: string; x: number; y: number; lat: number; lng: number };

export const CITIES: CityGeo[] = Object.entries(IRAN_CITY_DATA)
  .filter(([name]) => CITY_LATLNG[name])
  .map(([name, c]) => ({ name, x: c.x, y: c.y, lat: CITY_LATLNG[name][0], lng: CITY_LATLNG[name][1] }));

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** نزدیک‌ترین شهر شناخته‌شده به یک مختصات جغرافیایی (برای تبدیل GPS واقعی کاربر به نقطه‌ای روی نقشه). */
export function nearestCity(lat: number, lng: number): CityGeo {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = haversineKm({ lat, lng }, c);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** نزدیک‌ترین شهر بر اساس مختصات x/y روی خودِ نقشه (برای حدس شهر وقتی کاربر مستقیم روی نقشه پین می‌زند). */
export function nearestCityByXY(x: number, y: number): CityGeo {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/** نزدیک‌ترین مختصات شهر شناخته‌شده با نام دقیق (برای وصل کردن متخصص‌های واقعی CRM به نقشه). */
export function findCity(name: string): CityGeo | undefined {
  return CITIES.find((c) => c.name === name);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** جابه‌جایی جزئی و ثابت (بر اساس id) تا چند پین در یک شهر روی هم نیفتند. */
function jitter(id: string): [number, number] {
  const h = hashStr(id);
  const a = ((h % 1000) / 1000) * Math.PI * 2;
  const r = 6 + (h % 7);
  return [Math.cos(a) * r, Math.sin(a) * r];
}

const REVIEW_NAMES = ["سارا", "نیلوفر", "مریم", "الناز", "پریسا", "مهسا", "ژاله", "دنیا", "هانیه", "سحر", "کیانا", "رویا", "لیلا", "فرزانه", "طاهره", "آرزو"];
const REVIEW_TEXTS = [
  "برخورد خیلی حرفه‌ای و دقیق داشت، نتیجه فوق‌العاده بود.",
  "وقت‌شناس و مهربون بود، حتماً دوباره مراجعه می‌کنم.",
  "کیفیت کار عالی بود، فقط کمی شلوغ بود.",
  "دقیقاً همون چیزی که می‌خواستم رو گرفتم، پیشنهاد می‌کنم.",
  "محیط تمیز و آرامش‌بخش، خدمات باکیفیت.",
  "قیمت منصفانه و کار تمیز بود، راضی بودم.",
  "قبل از شروع کامل توضیح داد، خیلی حرفه‌ای بود.",
  "نتیجه فراتر از انتظارم بود!",
  "کمی دیر شروع شد ولی نتیجه‌ی نهایی عالی بود.",
  "مشاوره‌ی خوبی داد و دقیقاً مدل موردنظرم رو اجرا کرد.",
];

export type Review = { name: string; rating: number; text: string; daysAgo: number };

export function reviewsFor(id: string, rating: number): Review[] {
  const base = hashStr(id);
  const n = 2 + (base % 3);
  const out: Review[] = [];
  for (let i = 0; i < n; i++) {
    const h = (base ^ Math.imul(i + 1, 2654435761)) >>> 0;
    out.push({
      name: REVIEW_NAMES[h % REVIEW_NAMES.length],
      text: REVIEW_TEXTS[Math.floor(h / 97) % REVIEW_TEXTS.length],
      rating: Math.max(3, Math.min(5, Math.round(rating) - (h % 5 === 0 ? 1 : 0))),
      daysAgo: 2 + (h % 45),
    });
  }
  return out;
}

export type FinderPro = {
  id: string; name: string; salon: string; city: string; cats: FinderCat[]; rating: number; reviews: number; from: number; bio: string; verified: boolean;
};

export const FINDER_PROS: FinderPro[] = [
  { id: "f1", name: "شبنم رادمنش", salon: "سالن رُز آتلیه", city: "تهران", cats: ["مو"], rating: 4.9, reviews: 212, from: 1_800_000, bio: "متخصص رنگ و بالیاژ با ۱۲ سال سابقه", verified: true },
  { id: "f2", name: "نیوشا کامرانی", salon: "کلینیک پوست الهام", city: "تهران", cats: ["پوست", "لیزر"], rating: 4.8, reviews: 165, from: 1_100_000, bio: "فیشیال، پاکسازی و لیزر موهای زائد", verified: true },
  { id: "f3", name: "یگانه شریفی", salon: "استودیو ناخن سارا", city: "تهران", cats: ["ناخن"], rating: 4.7, reviews: 98, from: 450_000, bio: "کاشت و طراحی ناخن، ژل‌کاری", verified: false },
  { id: "f4", name: "نگار محمودی", salon: "براو استودیو", city: "تهران", cats: ["ابرو و مژه", "آرایش"], rating: 4.9, reviews: 140, from: 650_000, bio: "میکروبلیدینگ ابرو و اکستنشن مژه", verified: true },
  { id: "f5", name: "بابک صفری", salon: "بربرشاپ باربد", city: "تهران", cats: ["اصلاح مردانه"], rating: 4.6, reviews: 76, from: 350_000, bio: "اصلاح مو و ریش مردانه", verified: false },
  { id: "f6", name: "رعنا اسدی", salon: "سالن کراتینه", city: "کرج", cats: ["مو"], rating: 4.8, reviews: 88, from: 1_500_000, bio: "کراتین، اتو مغناطیسی و کوتاهی", verified: true },
  { id: "f7", name: "پریسا نوری", salon: "پردیس بیوتی", city: "اصفهان", cats: ["مو", "آرایش"], rating: 4.9, reviews: 130, from: 1_200_000, bio: "رنگ مو و آرایش عروس", verified: true },
  { id: "f8", name: "مهسا کاظمی", salon: "کلینیک زیبایی مهسا", city: "اصفهان", cats: ["پوست"], rating: 4.7, reviews: 71, from: 900_000, bio: "فیشیال و مزوتراپی", verified: false },
  { id: "f9", name: "شیدا فرزین", salon: "شیراز بیوتی", city: "شیراز", cats: ["ناخن", "ابرو و مژه"], rating: 4.6, reviews: 54, from: 400_000, bio: "طراحی ناخن و لمینت ابرو", verified: false },
  { id: "f10", name: "آرزو یوسفی", salon: "سالن یاس شیراز", city: "شیراز", cats: ["مو"], rating: 4.8, reviews: 92, from: 1_300_000, bio: "بالیاژ و رنگ فانتزی", verified: true },
  { id: "f11", name: "لیلا اکبری", salon: "کلینیک تبریز", city: "تبریز", cats: ["پوست", "لیزر"], rating: 4.7, reviews: 63, from: 1_000_000, bio: "لیزر موهای زائد و جوانسازی پوست", verified: true },
  { id: "f12", name: "رویا حیدری", salon: "سالن آرمانی تبریز", city: "تبریز", cats: ["مو", "آرایش"], rating: 4.5, reviews: 40, from: 950_000, bio: "کوتاهی مدرن و آرایش شب", verified: false },
  { id: "f13", name: "فرزانه رستمی", salon: "اهواز بیوتی سنتر", city: "اهواز", cats: ["ناخن"], rating: 4.6, reviews: 48, from: 380_000, bio: "کاشت ناخن پودری", verified: false },
  { id: "f14", name: "زهرا موسوی", salon: "سالن رشت گلاره", city: "رشت", cats: ["مو", "پوست"], rating: 4.7, reviews: 55, from: 1_050_000, bio: "رنگ مو و پاکسازی پوست", verified: true },
  { id: "f15", name: "کیانا صادقی", salon: "استودیو یزد", city: "یزد", cats: ["ابرو و مژه"], rating: 4.8, reviews: 61, from: 500_000, bio: "میکروبلیدینگ و لیفت مژه", verified: true },
  { id: "f16", name: "مینا قاسمی", salon: "کرمان بیوتی", city: "کرمان", cats: ["مو", "ناخن"], rating: 4.5, reviews: 33, from: 700_000, bio: "کوتاهی، رنگ و کاشت ناخن", verified: false },
  { id: "f17", name: "امیر رحیمی", salon: "بربرشاپ بندر", city: "بندرعباس", cats: ["اصلاح مردانه"], rating: 4.6, reviews: 29, from: 300_000, bio: "اصلاح و فیشیال مردانه", verified: false },
  { id: "f18", name: "سمیرا نجفی", salon: "سالن ساحل ساری", city: "ساری", cats: ["پوست", "آرایش"], rating: 4.7, reviews: 44, from: 850_000, bio: "فیشیال هیدرا و آرایش", verified: true },
  { id: "f19", name: "طاهره کریمی", salon: "کلینیک همدان", city: "همدان", cats: ["مو"], rating: 4.4, reviews: 21, from: 800_000, bio: "رنگ و مش موی طبیعی", verified: false },
  { id: "f20", name: "الناز جعفری", salon: "استودیو قزوین", city: "قزوین", cats: ["ناخن", "ابرو و مژه"], rating: 4.6, reviews: 37, from: 420_000, bio: "طراحی ناخن و لمینت", verified: false },
  { id: "f21", name: "دنیا ابراهیمی", salon: "سالن اردبیل نگین", city: "اردبیل", cats: ["مو", "پوست"], rating: 4.5, reviews: 26, from: 750_000, bio: "کراتین و پاکسازی پوست", verified: false },
  { id: "f22", name: "ژاله فرهادی", salon: "سالن قم آفتاب", city: "قم", cats: ["آرایش", "ابرو و مژه"], rating: 4.6, reviews: 31, from: 600_000, bio: "آرایش مجلسی و طراحی ابرو", verified: true },
  { id: "f23", name: "هانیه توکلی", salon: "سالن اراک", city: "اراک", cats: ["ناخن"], rating: 4.4, reviews: 18, from: 380_000, bio: "کاشت و ژل‌کاری ناخن", verified: false },
  { id: "f24", name: "سحر امینی", salon: "کلینیک زنجان", city: "زنجان", cats: ["پوست", "لیزر"], rating: 4.5, reviews: 22, from: 900_000, bio: "لیزر و مراقبت پوست", verified: false },
];

export type FinderProGeo = FinderPro & {
  x: number; y: number; lat: number; lng: number; tint: [string, string]; portfolio: number; reviewList: Review[];
  /** آیا این متخصص روی پنل مدیریت اکسیر فعال است؛ فقط این‌ها امکان رزرو مستقیم دارند. */
  onCrm: boolean; staffId?: string; photos?: string[];
  /** اگر از ثبت‌نام مستقل روی اکسیریاب آمده باشد: شناسه‌ی پروفایل، پلن، و شماره تماس برای هماهنگی/درخواست نوبت. */
  listingId?: string; plan?: "free" | "artist" | "salon"; phone?: string;
  /** Real direct-booking page of the salon (public wizard), when the listing runs a dashboard on a plan with online booking. */
  bookingUrl?: string;
};

export function tintFor(cats: FinderCat[]): [string, string] {
  const dot = catStyle[cats[0]].dot;
  return [`${dot}55`, "#f6ecd6"];
}

export function listFinderPros(): FinderProGeo[] {
  const byCity = new Map(CITIES.map((c) => [c.name, c]));
  return FINDER_PROS.map((p) => {
    const c = byCity.get(p.city);
    const [dx, dy] = jitter(p.id);
    return {
      ...p, x: (c?.x ?? 291) + dx, y: (c?.y ?? 264) + dy, lat: c?.lat ?? 32.4, lng: c?.lng ?? 53.7,
      tint: tintFor(p.cats), portfolio: 3 + (hashStr(p.id) % 3), reviewList: reviewsFor(p.id, p.rating), onCrm: false,
    };
  });
}
