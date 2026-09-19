import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageTitle } from "@/components/ui";

type SP = { staff?: string; day?: string; start?: string; service?: string; move?: string };
export default async function NewAppt({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const num = (v?: string) => (v !== undefined && v !== "" && !Number.isNaN(+v) ? +v : undefined);
  return (
    <>
      <PageTitle title={sp.move ? "جابه‌جایی نوبت" : "نوبت جدید"} sub="تداخل با نوبت‌های دیگر خودکار جلوگیری می‌شود" />
      <BookingWizard mode="staff" initial={{ staff: sp.staff, day: num(sp.day), start: num(sp.start), service: sp.service, move: sp.move }} />
    </>
  );
}
