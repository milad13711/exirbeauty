import { prisma } from "../db";
import type { Session } from "../http/types";

export async function audit(actor: Session | null, action: string, entity: string, entityId?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId: actor?.userId, actorRole: actor?.role, action, entity, entityId, meta: meta as object | undefined },
  });
}
