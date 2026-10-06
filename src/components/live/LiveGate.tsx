"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { crm, type Me } from "@/lib/crmApi";
import { useQuery } from "@/lib/useQuery";
import { Card } from "@/components/ui";
import { ErrorNote, Spinner } from "./ui";

const Ctx = createContext<Me | null>(null);
export const useMe = () => { const m = useContext(Ctx); if (!m) throw new Error("useMe outside LiveGate"); return m; };
export const canManage = (m: Me) => m.role !== "STAFF";

/** Wraps screens that talk to the real backend: needs a real session bound to a salon, otherwise sends the user to /login. */
export function LiveGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const me = useQuery(crm.me, []);

  const unauthorized = me.unauthorized;
  useEffect(() => { if (unauthorized) router.replace(`/login?next=${encodeURIComponent(path)}`); }, [unauthorized, path, router]);
  if (unauthorized) return <Spinner label="در حال انتقال به صفحه ورود…" />;
  if (me.loading && !me.data) return <Spinner />;
  if (!me.data) return <ErrorNote message="ارتباط با سرور برقرار نشد." onRetry={me.reload} />;
  if (!me.data.tenantId) {
    return <Card className="mx-auto max-w-md p-6 text-center text-sm leading-7 text-ink2">این حساب به هیچ سالنی وصل نیست. با حساب مالک یا پرسنل سالن وارد شوید.</Card>;
  }
  return <Ctx.Provider value={me.data}>{children}</Ctx.Provider>;
}
