import Link from "next/link";
import { CartProvider } from "@/components/store/CartProvider";
import { StoreHeader } from "@/components/store/StoreHeader";

export default function StoreLayout({ children }: LayoutProps<"/store">) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-bg">
        <StoreHeader />
        <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 lg:px-8 lg:pt-6"><div className="page-in">{children}</div></main>
        <footer className="mt-4 mb-24 border-t border-line bg-surface px-4 py-8 text-center text-xs text-ink3 lg:mb-0">
          <p>اکسیر شاپ · محصولات اصل مراقبت و زیبایی · مرجوعی تا ۷ روز</p>
          <Link href="/store/track" className="mt-2 inline-block text-ink3 underline">پیگیری سفارش</Link>{" · "}<Link href="/" className="mt-2 inline-block text-ink3 underline">ورود سالن‌داران</Link>
        </footer>
      </div>
    </CartProvider>
  );
}
