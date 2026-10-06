import { describe, expect, it } from "vitest";
import { compile, dispatch } from "./router";
import type { Route } from "./types";

const ok = (v: unknown) => async () => v;
const routes: Route[] = [
  { method: "GET", path: "/things/:id", handler: async (c) => ({ kind: "byId", id: c.params.id }) },
  { method: "GET", path: "/things/mine", handler: ok({ kind: "mine" }) },
  { method: "POST", path: "/things", handler: async (c) => ({ got: await c.body() }) },
  { method: "GET", path: "/secret", auth: "user", handler: ok("x") },
  { method: "GET", path: "/boom", handler: async () => { throw new Error("db password is hunter2"); } },
];
const table = compile(routes);
const call = (method: string, segs: string[], init: RequestInit = {}) =>
  dispatch(new Request("http://localhost/api/v1/" + segs.join("/"), { method, ...init }), segs, table);

describe("router", () => {
  it("prefers literal segments over params", async () => {
    expect(await (await call("GET", ["things", "mine"])).json()).toEqual({ data: { kind: "mine" } });
    expect(await (await call("GET", ["things", "42"])).json()).toEqual({ data: { kind: "byId", id: "42" } });
  });

  it("404 for unknown paths and 405 (with Allow) for wrong methods", async () => {
    expect((await call("GET", ["nope"])).status).toBe(404);
    const r = await call("DELETE", ["things", "1"]);
    expect(r.status).toBe(405);
    expect(r.headers.get("allow")).toBe("GET");
  });

  it("requires a session on protected routes", async () => {
    const r = await call("GET", ["secret"]);
    expect(r.status).toBe(401);
    expect((await r.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("rejects malformed JSON and cross-origin writes", async () => {
    expect((await call("POST", ["things"], { body: "{bad", headers: { "content-type": "application/json" } })).status).toBe(400);
    const cross = await call("POST", ["things"], { body: "{}", headers: { origin: "https://evil.example", host: "localhost" } });
    expect(cross.status).toBe(403);
    expect((await cross.json()).error.code).toBe("BAD_ORIGIN");
  });

  it("never leaks internal error messages", async () => {
    const r = await call("GET", ["boom"]);
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("hunter2");
  });
});
