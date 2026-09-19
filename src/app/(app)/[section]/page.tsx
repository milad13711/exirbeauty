import { navGroups } from "@/components/nav";
import { Card, PageTitle } from "@/components/ui";
import { Hourglass } from "lucide-react";
import { notFound } from "next/navigation";

export default async function Soon({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const item = navGroups.flatMap((g) => g.items).find((i) => i.href === `/${section}`);
  if (!item) notFound();
  return (
    <>
      <PageTitle title={item.label} sub={`بخش ${item.n} از نقشه‌راه`} />
      <Card className="grid place-items-center gap-3 px-6 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-rosesoft text-rose"><Hourglass /></span>
        <p className="font-bold">طراحی این بخش در مرحله‌ی بعدی UI انجام می‌شود</p>
        <p className="max-w-md text-sm text-ink2">ابتدا هسته‌ی محصول (داشبورد، مشتری ۳۶۰، پرونده زیبایی و تقویم) را کامل و تأیید می‌کنیم.</p>
      </Card>
    </>
  );
}
