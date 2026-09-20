import type { Metadata, Viewport } from "next";
import "./globals.css";
import { modeBootScript } from "@/lib/mode";
import { DBGate } from "@/components/DBGate";

export const metadata: Metadata = {
  title: "اکسیر بیوتی | مدیریت سالن زیبایی",
  description: "CRM تخصصی سالن زیبایی؛ مشتری را بشناس، نوبت هوشمند بده، درآمد بساز.",
};

export const viewport: Viewport = { themeColor: "#fbf6f1", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: modeBootScript }} /></head>
      <body className="min-h-full"><DBGate>{children}</DBGate></body>
    </html>
  );
}
