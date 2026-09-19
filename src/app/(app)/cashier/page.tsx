import { CashierApp } from "@/components/cashier/CashierApp";

export default async function Cashier({ searchParams }: { searchParams: Promise<{ appt?: string }> }) {
  const { appt } = await searchParams;
  return <CashierApp apptId={appt} />;
}
