import { LiveCashier } from "@/components/live/LiveCashier";

export default async function Cashier({ searchParams }: { searchParams: Promise<{ appt?: string }> }) {
  const { appt } = await searchParams;
  return <LiveCashier apptId={appt ?? null} />;
}
