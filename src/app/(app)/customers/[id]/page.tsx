import { notFound } from "next/navigation";
import { profile } from "@/lib/mock";
import { Profile } from "./Profile";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== profile.id) notFound();
  return <Profile c={profile} />;
}
