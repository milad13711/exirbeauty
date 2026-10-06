import { LiveSms } from "@/components/live/LiveSms";

export default async function SmsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <LiveSms initialTab={tab} />;
}
