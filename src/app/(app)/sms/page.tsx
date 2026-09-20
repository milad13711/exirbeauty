import { SmsHub } from "@/components/sms/SmsHub";

export default async function SmsPage({ searchParams }: { searchParams: Promise<{ tab?: string; pkg?: string }> }) {
  const { tab, pkg } = await searchParams;
  return <SmsHub initialTab={tab} pkg={pkg} />;
}
