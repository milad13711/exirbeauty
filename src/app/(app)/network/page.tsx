import { Briefcase, Camera, Megaphone, Palette, Shield, UserPlus, Wrench, Armchair, Landmark, Lightbulb } from "lucide-react";
import { Badge, Card, PageTitle } from "@/components/ui";

const s = [["بیمه", Shield], ["خدمات مالی", Landmark], ["تجهیزات", Wrench], ["اجاره صندلی", Armchair], ["استخدام متخصص", UserPlus], ["تأمین مواد", Briefcase], ["تبلیغات", Megaphone], ["عکاسی", Camera], ["طراحی", Palette], ["مشاوره کسب‌وکار", Lightbulb]] as const;

export default function Network() {
  return (
    <>
      <PageTitle title="شبکه خدمات جانبی" sub="سالن فقط نرم‌افزار نمی‌خرد؛ وارد یک شبکه‌ی تخصصی کسب‌وکار می‌شود" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {s.map(([n, I]) => <Card key={n} className="p-5 text-center"><I className="mx-auto text-rose" size={26} /><p className="mt-2 text-sm font-bold">{n}</p><Badge className="mt-2">به‌زودی</Badge></Card>)}
      </div>
    </>
  );
}
