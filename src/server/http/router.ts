import { ZodError } from "zod";
import { HttpError, forbidden, unauthorized } from "./errors";
import { clientIp } from "./ratelimit";
import type { Ctx, Method, Route } from "./types";
import { readSession } from "../platform/auth/session";
import { assertModuleActive } from "../platform/modules/service";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY = 1_000_000;

type Compiled = { route: Route; parts: string[]; literals: number };

export function compile(routes: Route[]): Compiled[] {
  const out = routes.map((route) => {
    const parts = route.path.split("/").filter(Boolean);
    return { route, parts, literals: parts.filter((p) => !p.startsWith(":")).length };
  });
  // Prefer routes with more literal segments so "/finder/listings/mine" beats "/finder/listings/:id"
  return out.sort((a, b) => b.literals - a.literals);
}

function match(c: Compiled, segs: string[]): Record<string, string> | null {
  if (c.parts.length !== segs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < segs.length; i++) {
    const p = c.parts[i];
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(segs[i]);
    else if (p !== segs[i]) return null;
  }
  return params;
}

function json(status: number, body: unknown, headers?: Headers): Response {
  const h = new Headers(headers);
  h.set("content-type", "application/json; charset=utf-8");
  h.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: h });
}

/** Browsers always send Origin on cross-site writes; reject when it doesn't match the host. */
function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (new URL(origin).host !== host) throw forbidden("درخواست از مبدأ نامعتبر", "BAD_ORIGIN");
}

export async function dispatch(req: Request, segments: string[], table: Compiled[]): Promise<Response> {
  const headers = new Headers();
  try {
    const method = req.method as Method;
    const matches = table.map((c) => ({ c, params: match(c, segments) })).filter((m) => m.params);
    if (!matches.length) throw new HttpError(404, "NOT_FOUND", "مسیر پیدا نشد");
    const hit = matches.find((m) => m.c.route.method === method);
    if (!hit) {
      const allow = [...new Set(matches.map((m) => m.c.route.method))].join(", ");
      return json(405, { error: { code: "METHOD_NOT_ALLOWED", message: "متد مجاز نیست" } }, new Headers({ allow }));
    }
    const { route } = hit.c;
    if (MUTATING.has(method)) assertSameOrigin(req);

    const session = await readSession(req);
    const rule = route.auth ?? "public";
    if (rule !== "public") {
      if (!session) throw unauthorized();
      if (rule !== "user" && !rule.roles.includes(session.role)) throw forbidden();
    }

    // Tenant context: a tenant user acts on their own tenant; admins name one explicitly.
    let tenantId: string | null = session?.tenantId ?? null;
    const isAdmin = session?.role === "ADMIN" || session?.role === "SUPER_ADMIN";
    const asked = req.headers.get("x-tenant-id");
    if (isAdmin && asked) tenantId = asked;

    if (route.module) {
      if (!tenantId) throw forbidden("برای این بخش باید سالن مشخص باشد", "TENANT_REQUIRED");
      await assertModuleActive(tenantId, route.module);
    }

    let cachedBody: unknown;
    const ctx: Ctx = {
      req, params: hit.params!, query: new URL(req.url).searchParams, session, tenantId, ip: clientIp(req), headers,
      body: async () => {
        if (cachedBody !== undefined) return cachedBody;
        if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) throw new HttpError(413, "TOO_LARGE", "حجم درخواست زیاد است");
        const text = await req.text();
        if (text.length > MAX_BODY) throw new HttpError(413, "TOO_LARGE", "حجم درخواست زیاد است");
        if (!text) return (cachedBody = {});
        try { return (cachedBody = JSON.parse(text)); } catch { throw new HttpError(400, "BAD_JSON", "بدنه‌ی درخواست JSON معتبر نیست"); }
      },
    };

    const result = await route.handler(ctx);
    if (result instanceof Response) return result;
    return json(200, { data: result ?? null }, headers);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: { code: e.code, message: e.message, details: e.details } }, headers);
    if (e instanceof ZodError) return json(422, { error: { code: "VALIDATION_FAILED", message: "اطلاعات واردشده معتبر نیست" } }, headers);
    console.error("[api] unhandled", e);
    return json(500, { error: { code: "INTERNAL", message: "خطای داخلی سرور" } }, headers);
  }
}
