import { BookingWizard } from "@/components/booking/BookingWizard";
import { BookHeader } from "@/components/booking/BookHeader";
import { BookGate } from "@/components/booking/BookGate";

export default async function Book({ searchParams }: { searchParams: Promise<{ staff?: string; move?: string; ref?: string }> }) {
  const { staff: sid, move, ref } = await searchParams;
  return (
    <BookGate>
      <BookHeader staffId={sid} />
      <BookingWizard mode="public" initial={{ staff: sid, move, ref }} />
    </BookGate>
  );
}
