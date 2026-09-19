import { BookingWizard } from "@/components/booking/BookingWizard";
import { Avatar } from "@/components/ui";
import { staff } from "@/lib/mock";
import { fa } from "@/lib/fa";

export default async function Book({ searchParams }: { searchParams: Promise<{ staff?: string }> }) {
  const { staff: sid } = await searchParams;
  const s = staff.find((x) => x.id === sid);
  return (
    <>
      {s ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <Avatar name={s.name} color={s.color} size={52} />
          <div className="min-w-0 flex-1"><h1 className="font-extrabold">رزرو نوبت از {s.name}</h1><p className="text-sm text-ink2">{s.role} · ★ {fa(s.rating)}</p></div>
        </div>
      ) : (
        <h1 className="mb-5 text-xl font-extrabold">رزرو نوبت</h1>
      )}
      <BookingWizard mode="public" initial={{ staff: s?.id }} />
    </>
  );
}
