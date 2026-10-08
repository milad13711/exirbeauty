"use client";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { crm, type Entitlements, type ModuleEnt } from "./crmApi";
import { useQuery } from "./useQuery";
import { setLiveBrand } from "./liveBrand";
import { useEffect } from "react";

type Ctx = { loading: boolean; live: boolean; data: Entitlements | null; get: (id: string) => ModuleEnt | undefined; isActive: (id: string) => boolean; reload: () => Promise<void> };
const C = createContext<Ctx>({ loading: false, live: false, data: null, get: () => undefined, isActive: () => true, reload: async () => {} });

/**
 * The signed-in salon's real module state (plan ∪ add-ons, installed, dependencies) from /tenant/modules.
 * `live` is false when there's no session or no salon — screens then fall back to the prototype's local state.
 */
export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const q = useQuery(() => crm.entitlements().catch(() => null), []);
  const tenant = useQuery(() => crm.tenant().catch(() => null), []);
  useEffect(() => { setLiveBrand(tenant.data?.brandColor ?? null); }, [tenant.data?.brandColor]);
  const reload = useCallback(async () => { await q.reload(); }, [q.reload]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo<Ctx>(() => {
    const data = q.data;
    const byId = new Map(data?.modules.map((m) => [m.id, m]));
    return { loading: q.loading && !q.data, live: !!data, data, get: (id) => byId.get(id), isActive: (id) => byId.get(id)?.active ?? false, reload };
  }, [q.data, q.loading, reload]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useEntitlements = () => useContext(C);
