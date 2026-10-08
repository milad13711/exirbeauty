import { LiveCoursePlayer } from "@/components/live/LiveAcademy";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveCoursePlayer id={id} />;
}
