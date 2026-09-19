import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageTitle } from "@/components/ui";

type SP = { staff?: string; day?: string; start?: string; service?: string };
export default async function NewAppt({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const num = (v?: string) => (v !== undefined && v !== "" && !Number.isNaN(+v) ? +v : undefined);
  return (
    <>
      <PageTitle title="نوبت جدید" sub="ثبت نوبت توسط پذیرش یا متخصص؛ تداخل با نوبت‌های دیگر خودکار جلوگیری می‌شود" />
      <BookingWizard mode="staff" initial={{ staff: sp.staff, day: num(sp.day), start: num(sp.start), service: sp.service }} />
    </>
  );
}
