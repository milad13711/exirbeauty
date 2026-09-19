import { PortalShell } from "@/components/portal/PortalShell";

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
