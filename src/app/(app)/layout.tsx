import { Shell } from "@/components/Shell";
import { ModuleGate } from "@/components/ModuleGate";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <Shell><ModuleGate>{children}</ModuleGate></Shell>;
}
