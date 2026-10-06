import { Shell } from "@/components/Shell";
import { ModuleGate } from "@/components/ModuleGate";
import { EntitlementsProvider } from "@/lib/entitlements";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <EntitlementsProvider><Shell><ModuleGate>{children}</ModuleGate></Shell></EntitlementsProvider>;
}
