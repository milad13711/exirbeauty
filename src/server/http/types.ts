import type { Role } from "@prisma/client";

export type Session = { userId: string; role: Role; tenantId: string | null; name: string };
export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** public: no login · user: any signed-in user · { roles }: signed-in with one of these roles */
export type AuthRule = "public" | "user" | { roles: readonly Role[] };

export type Ctx = {
  req: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  session: Session | null;
  /** Tenant this request acts on (own tenant, or `x-tenant-id` for admins). Null on platform routes. */
  tenantId: string | null;
  ip: string;
  /** Extra response headers (e.g. Set-Cookie) */
  headers: Headers;
  /** Parsed JSON body (size-capped); empty object when there is none */
  body: () => Promise<unknown>;
};

export type Route = {
  method: Method;
  /** e.g. "/finder/listings/:id" (mounted under /api/v1) */
  path: string;
  auth?: AuthRule; // default "public"
  /** Module that must be active for the acting tenant (tenant-scoped modules) */
  module?: string;
  handler: (c: Ctx) => Promise<unknown>;
};
