import { Profile } from "./Profile";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Profile id={id} />;
}
