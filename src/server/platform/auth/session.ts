import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { env } from "../../env";
import type { Session } from "../../http/types";

export const SESSION_COOKIE = "exir_session";
const MAX_AGE_S = 60 * 60 * 24 * 7;

const key = () => new TextEncoder().encode(env().AUTH_SECRET);

export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ role: s.role, tid: s.tenantId, name: s.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(key());
}

export async function readSession(req: Request): Promise<Session | null> {
  const token = req.headers.get("cookie")?.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role as Role, tenantId: (payload.tid as string | null) ?? null, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  const secure = env().NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_S}${secure}`;
}
export const clearedSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
