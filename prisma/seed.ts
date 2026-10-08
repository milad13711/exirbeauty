import { prisma } from "../src/server/db";
import { MODULES } from "../src/server/modules";
import { DEFAULT_PLANS } from "../src/server/platform/plans";
import { hashPassword } from "../src/server/platform/auth/password";
import { syncCatalog, seedPlanMatrix } from "../src/server/platform/modules/sync";
import { createTenant } from "../src/server/platform/tenants";

async function main() {
  // Plans: create-only so admin edits to price/limits survive re-seeding.
  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({ where: { code: p.code }, create: p, update: {} });
  }
  const sync = await syncCatalog(MODULES);
  console.log("modules created:", sync.created.length, sync.orphaned.length ? `| orphaned in DB (not in code): ${sync.orphaned.join(", ")}` : "");
  console.log("plan matrix seeded:", (await seedPlanMatrix(MODULES)).join(", ") || "(already set)");

  const email = process.env.SEED_ADMIN_EMAIL, password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters");
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), name: "ادمین اکسیر", role: "SUPER_ADMIN", passwordHash: await hashPassword(password) },
      update: {},
    });
    console.log("super admin ready:", email);
  } else console.log("SEED_ADMIN_EMAIL/PASSWORD not set — no admin created");

  // Starter SMS credit packages (admins edit them afterwards in the admin panel); only when none exist.
  if (!(await prisma.smsPackage.count())) {
    await prisma.smsPackage.createMany({ data: [
      { name: "شروع", price: 100_000, bonusPct: 0, sortOrder: 1 },
      { name: "رشد", price: 500_000, bonusPct: 10, sortOrder: 2 },
      { name: "حرفه‌ای", price: 2_000_000, bonusPct: 20, sortOrder: 3 },
    ] });
  }

  // Starter academy catalog (the platform team edits it in the admin panel); only when none exists.
  if (!(await prisma.course.count())) {
    const lesson = (title: string, minutes: number, body: string) => ({ title, minutes, body });
    await prisma.course.createMany({ data: [
      { title: "مقدمه‌ای بر مدیریت سالن", description: "قیمت‌گذاری، برنامه‌ریزی نوبت و نگه‌داشت مشتری برای مدیران سالن.", audience: "OWNER", hours: 1.5, price: 0, published: true, lessons: [lesson("اصول قیمت‌گذاری خدمات", 20, "هزینه‌ی مواد، زمان و سهم متخصص را محاسبه کنید و حاشیه‌ی سود هر خدمت را بشناسید."), lesson("برنامه‌ریزی تقویم", 25, "ساعت کاری، استراحت و ظرفیت خالی را طوری بچینید که صندلی‌ها کمتر خالی بمانند."), lesson("نگه‌داشت مشتری", 30, "یادآوری نوبت، باشگاه مشتریان و پیام‌های به‌موقع، مشتری را برمی‌گرداند.")] },
      { title: "ارتباط با مشتری برای متخصص‌ها", description: "گفت‌وگوی حرفه‌ای، مدیریت انتظار و پرونده‌ی زیبایی مشتری.", audience: "STAFF", hours: 1, price: 0, inPlans: ["salon", "artist"], published: true, lessons: [lesson("اولین برخورد", 15, "خوش‌آمدگویی، پرسیدن سابقه و حساسیت‌ها پیش از شروع."), lesson("ثبت پرونده‌ی زیبایی", 20, "فرمول رنگ، حساسیت‌ها و تاریخ آخرین خدمت را در پرونده بنویسید.")] },
      { title: "بازاریابی پیشرفته برای سالن", description: "کمپین، معرفی دوستان و شبکه‌های اجتماعی.", audience: "ALL", hours: 2, price: 490_000, published: true, lessons: [lesson("ساخت کمپین هدفمند", 30, "مخاطب را با شرط‌های دقیق انتخاب کنید."), lesson("برنامه‌ی معرفی دوستان", 25, "پاداش را طوری تنظیم کنید که هم جذاب باشد هم سودآور."), lesson("محتوای شبکه‌های اجتماعی", 35, "نمونه‌کار قبل و بعد با اجازه‌ی مشتری.")] },
    ] });
  }

  // Starter store catalog (the platform team edits it in the admin panel); only when none exists.
  if (!(await prisma.storeProduct.count())) {
    await prisma.storeProduct.createMany({ data: [
      { name: "شامپو ترمیم‌کننده بدون سولفات", brand: "Silk Lab", category: "مو", price: 650_000, oldPrice: 720_000, commissionPct: 12, stock: 40, description: "مخصوص موهای کراتینه و رنگ‌شده؛ ماندگاری نتیجه‌ی خدمات سالن را بیشتر می‌کند." },
      { name: "ماسک مو ابریشم", brand: "Silk Lab", category: "مو", price: 780_000, commissionPct: 12, stock: 25, description: "ماسک عمیق برای ترمیم انتهای موی خشک و آسیب‌دیده." },
      { name: "سرم ویتامین C", brand: "Derma Rose", category: "پوست", price: 1_150_000, commissionPct: 15, stock: 18, description: "روشن‌کننده و ضدلکه برای پوست ترکیبی و معمولی." },
      { name: "ضدآفتاب SPF50 بی‌رنگ", brand: "Derma Rose", category: "پوست", price: 540_000, commissionPct: 15, stock: 60, description: "سبک، بدون سفیدی روی پوست، مناسب زیر آرایش." },
      { name: "ست ژل و لاک خانگی", brand: "Nail Muse", category: "ناخن", price: 1_350_000, commissionPct: 14, stock: 12, description: "چراغ UV، ۶ رنگ پرطرفدار، پایه و تاپ‌کوت." },
      { name: "ست مراقبت رنگ مو", brand: "Silk Lab", category: "ست هدیه", price: 1_900_000, oldPrice: 2_150_000, commissionPct: 18, stock: 15, description: "شامپو، ماسک و سرم در یک جعبه‌ی هدیه." },
    ] });
  }

  if (process.env.NODE_ENV !== "production" && !(await prisma.tenant.findUnique({ where: { slug: "demo-salon" } }))) {
    const t = await createTenant({ name: "سالن رُز (دمو)", slug: "demo-salon", city: "تهران", planCode: "salon" });
    console.log("demo tenant:", t.id);
  }

  // Optional: an owner for the demo tenant so OTP login can be tried with a real phone.
  const ownerPhone = process.env.SEED_OWNER_PHONE;
  const demo = await prisma.tenant.findUnique({ where: { slug: "demo-salon" } });
  if (ownerPhone && demo) {
    if (!/^09\d{9}$/.test(ownerPhone)) throw new Error("SEED_OWNER_PHONE must look like 09xxxxxxxxx");
    await prisma.user.upsert({ where: { phone: ownerPhone }, create: { phone: ownerPhone, name: "مالک دمو", role: "OWNER", tenantId: demo.id }, update: {} });
    console.log("demo owner ready:", ownerPhone);
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
