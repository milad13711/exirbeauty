import { describe, expect, it } from "vitest";
import { afterPlanChange, minPlanFor, resolveEntitlements } from "./entitlements";

const catalog = [
  { id: "calendar", requires: [], core: true },
  { id: "sms", requires: [], core: false },
  { id: "campaigns", requires: ["sms"], core: false },
  { id: "loop-a", requires: ["loop-b"], core: false },
  { id: "loop-b", requires: ["loop-a"], core: false },
];
const state = (i: Partial<Parameters<typeof resolveEntitlements>[0]>) =>
  resolveEntitlements({ catalog, planModuleIds: [], addonIds: [], installedIds: [], ...i });

describe("resolveEntitlements", () => {
  it("core modules are active as soon as the plan includes them, without being installed", () => {
    expect(state({ planModuleIds: ["calendar"] }).get("calendar")).toMatchObject({ available: true, installed: true, active: true, source: "plan" });
  });

  it("a plan module that isn't installed is available but not active", () => {
    expect(state({ planModuleIds: ["sms"] }).get("sms")).toMatchObject({ available: true, installed: false, active: false });
  });

  it("modules outside the plan are inactive even if a stale install row exists", () => {
    expect(state({ installedIds: ["sms"] }).get("sms")).toMatchObject({ available: false, installed: false, active: false, source: null });
  });

  it("an add-on makes a module available", () => {
    expect(state({ addonIds: ["sms"], installedIds: ["sms"] }).get("sms")).toMatchObject({ source: "addon", active: true });
  });

  it("a module is blocked until its required module is active", () => {
    const blocked = state({ planModuleIds: ["campaigns"], installedIds: ["campaigns"] }).get("campaigns")!;
    expect(blocked.active).toBe(false);
    expect(blocked.blockedBy).toEqual(["sms"]);
    const ok = state({ planModuleIds: ["campaigns", "sms"], installedIds: ["campaigns", "sms"] }).get("campaigns")!;
    expect(ok).toMatchObject({ active: true, blockedBy: [] });
  });

  it("dependency cycles resolve to inactive instead of looping", () => {
    const s = state({ planModuleIds: ["loop-a", "loop-b"], installedIds: ["loop-a", "loop-b"] });
    expect(s.get("loop-a")!.active).toBe(false);
    expect(s.get("loop-b")!.active).toBe(false);
  });
});

describe("afterPlanChange", () => {
  it("auto-installs newly available modules and drops lost ones", () => {
    const r = afterPlanChange({ oldPlanModuleIds: ["sms"], newPlanModuleIds: ["campaigns", "cashier"], addonIds: [], installedIds: ["sms"] });
    expect(r.installedIds.sort()).toEqual(["campaigns", "cashier"]);
  });

  it("add-ons now covered by the plan stop being billed; other add-ons survive", () => {
    const r = afterPlanChange({ oldPlanModuleIds: [], newPlanModuleIds: ["sms"], addonIds: ["sms", "ai"], installedIds: ["sms", "ai"] });
    expect(r.addonIds).toEqual(["ai"]);
    expect(r.installedIds.sort()).toEqual(["ai", "sms"]);
  });

  it("keeps the user's choice to leave a still-available module uninstalled", () => {
    const r = afterPlanChange({ oldPlanModuleIds: ["sms", "cashier"], newPlanModuleIds: ["sms", "cashier", "reports"], addonIds: [], installedIds: ["sms"] });
    expect(r.installedIds.sort()).toEqual(["reports", "sms"]);
  });
});

describe("minPlanFor", () => {
  const plans = [
    { code: "salon", sortOrder: 2, moduleIds: ["sms", "campaigns"] },
    { code: "artist", sortOrder: 1, moduleIds: ["sms"] },
  ];
  it("returns the cheapest plan including the module", () => expect(minPlanFor("sms", plans)).toBe("artist"));
  it("returns null for add-on-only modules", () => expect(minPlanFor("ai", plans)).toBeNull());
});
