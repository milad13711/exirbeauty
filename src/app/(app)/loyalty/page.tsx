import { LiveLoyalty } from "@/components/live/LiveLoyalty";

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <LiveLoyalty initialTab={tab} />;
}
