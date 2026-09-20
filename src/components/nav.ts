import {
  LayoutDashboard, Users, CalendarDays, Scissors, UserCog, Wallet, Crown, Share2, ShoppingBag, Wand2,
  Megaphone, Repeat, Star, Package, Gift, Store, GraduationCap, Truck, Bot, Smartphone, WalletCards,
  PenSquare, Network, Coins, BarChart3, MessageSquareText, type LucideIcon, HandCoins } from "lucide-react";

/** ماژول هر مورد از روی مسیر آن (modules.ts) تعیین می‌شود؛ موارد «هسته» همیشه نمایش داده می‌شوند */
export type NavItem = { href: string; label: string; icon: LucideIcon };
export const navGroups: { title: string; items: NavItem[] }[] = [
  { title: "هسته", items: [
    { href: "/", label: "داشبورد", icon: LayoutDashboard },
    { href: "/calendar", label: "تقویم و نوبت‌دهی", icon: CalendarDays },
    { href: "/customers", label: "مشتریان و پرونده‌ی زیبایی", icon: Users },
    { href: "/services", label: "منوی خدمات", icon: Scissors },
    { href: "/staff", label: "پرسنل و متخصص‌ها", icon: UserCog },
    { href: "/staff/settle", label: "تسویه پرسنل", icon: HandCoins },
  ]},
  { title: "عملیات سالن", items: [
    { href: "/cashier", label: "صندوق و درآمد", icon: Wallet },
    { href: "/procurement", label: "انبار و تأمین", icon: Truck },
    { href: "/reports", label: "گزارش‌ها", icon: BarChart3 },
  ]},
  { title: "ارتباط با مشتری", items: [
    { href: "/sms", label: "پیامک و اعتبار", icon: MessageSquareText },
    { href: "/automation", label: "سناریوهای خودکار", icon: Repeat },
    { href: "/campaigns", label: "کمپین و بازاریابی", icon: Megaphone },
    { href: "/reviews", label: "نظرسنجی و اعتبار", icon: Star },
  ]},
  { title: "وفاداری و درآمد جدید", items: [
    { href: "/loyalty", label: "باشگاه مشتریان", icon: Crown },
    { href: "/referral", label: "معرفی دوستان", icon: Share2 },
    { href: "/memberships", label: "پکیج و عضویت", icon: Package },
    { href: "/gift-cards", label: "کارت هدیه", icon: Gift },
    { href: "/wallet", label: "کیف پول و کش‌بک", icon: WalletCards },
    { href: "/referral-store", label: "فروشگاه اکسیر (پورسانت)", icon: Coins },
    { href: "/shop", label: "فروشگاه آنلاین", icon: ShoppingBag },
    { href: "/recommend", label: "توصیه هوشمند محصول", icon: Wand2 },
  ]},
  { title: "رشد و اکوسیستم", items: [
    { href: "/client-app", label: "پنل و اپ مشتری", icon: Smartphone },
    { href: "/content", label: "تولید محتوا", icon: PenSquare },
    { href: "/marketplace", label: "مارکت‌پلیس متخصص‌ها", icon: Store },
    { href: "/ai", label: "مدیر هوشمند سالن", icon: Bot },
    { href: "/academy", label: "آکادمی", icon: GraduationCap },
    { href: "/network", label: "شبکه خدمات جانبی", icon: Network },
  ]},
];
