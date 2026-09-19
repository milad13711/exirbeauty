import { BookingWizard } from "@/components/booking/BookingWizard";
import { BookHeader } from "@/components/booking/BookHeader";

export default async function Book({ searchParams }: { searchParams: Promise<{ staff?: string }> }) {
  const { staff: sid } = await searchParams;
  return (
    <>
      <BookHeader staffId={sid} />
      <BookingWizard mode="public" initial={{ staff: sid }} />
    </>
  );
}
