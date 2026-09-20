import { StaffShell } from "@/components/staff/StaffShell";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <StaffShell>{children}</StaffShell>;
}
