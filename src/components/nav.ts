import {
  LayoutDashboard, Users, CalendarDays, Scissors, UserCog, Wallet, Crown, Share2, ShoppingBag, Wand2,
  Megaphone, Repeat, Star, Package, Gift, Store, GraduationCap, Truck, Bot, Smartphone, WalletCards,
  PenSquare, Network, Sparkles, type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; ready?: boolean; n: number };
export const navGroups: { title: string; items: NavItem[] }[] = [
  { title: "هسته", items: [
    { n: 19, href: "/", label: "داشبورد هوش تجاری", icon: LayoutDashboard, ready: true },
    { n: 2, href: "/calendar", label: "تقویم و نوبت‌دهی", icon: CalendarDays, ready: true },
    { n: 1, href: "/customers", label: "مشتریان (CRM)", icon: Users, ready: true },
    { n: 3, href: "/customers/c1", label: "پرونده زیبایی", icon: Sparkles, ready: true },
  ]},
  { title: "عملیات سالن", items: [
    { n: 4, href: "/services", label: "منوی خدمات", icon: Scissors, ready: true },
    { n: 5, href: "/staff", label: "پرسنل و متخصص‌ها", icon: UserCog, ready: true },
    { n: 6, href: "/cashier", label: "صندوق و درآمد", icon: Wallet, ready: true },
    { n: 18, href: "/procurement", label: "تأمین و خرید عمده", icon: Truck },
  ]},
  { title: "رشد و وفاداری", items: [
    { n: 7, href: "/loyalty", label: "باشگاه مشتریان", icon: Crown, ready: true },
    { n: 8, href: "/referral", label: "معرفی دوستان", icon: Share2, ready: true },
    { n: 11, href: "/campaigns", label: "کمپین و بازاریابی", icon: Megaphone, ready: true },
    { n: 12, href: "/automation", label: "اتوماسیون بازگشت", icon: Repeat, ready: true },
    { n: 13, href: "/reviews", label: "نظرسنجی و اعتبار", icon: Star, ready: true },
    { n: 24, href: "/content", label: "تولید محتوا", icon: PenSquare },
  ]},
  { title: "فروش و درآمد جدید", items: [
    { n: 9, href: "/shop", label: "فروشگاه آنلاین", icon: ShoppingBag, ready: true },
    { n: 10, href: "/recommend", label: "توصیه هوشمند محصول", icon: Wand2, ready: true },
    { n: 14, href: "/memberships", label: "پکیج و عضویت", icon: Package, ready: true },
    { n: 15, href: "/gift-cards", label: "کارت هدیه", icon: Gift, ready: true },
    { n: 22, href: "/wallet", label: "کیف پول و کش‌بک", icon: WalletCards, ready: true },
  ]},
  { title: "اکوسیستم", items: [
    { n: 20, href: "/ai", label: "مدیر هوشمند سالن", icon: Bot },
    { n: 21, href: "/client-app", label: "پنل مشتری", icon: Smartphone },
    { n: 16, href: "/marketplace", label: "مارکت‌پلیس متخصص‌ها", icon: Store },
    { n: 17, href: "/academy", label: "آکادمی", icon: GraduationCap },
    { n: 25, href: "/network", label: "شبکه خدمات جانبی", icon: Network },
  ]},
];
