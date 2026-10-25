import { randomUUID } from "node:crypto";
import { EntityManager, IsNull, Not } from "typeorm";
import {
  REFRESH_GRACE_MS,
  REFRESH_LIFESPAN_MS,
} from "../../../config/constants";
import RefreshSession from "../../../data/entity/refresh-session.entity";

export type RefreshSessionIds = { sid: string; jti: string };

export type RotationDecision =
  | { kind: "rotate" }
  | { kind: "grace" }
  | { kind: "reuse" }
  | { kind: "invalid" };

export type RotationResult =
  | { kind: "rotated"; ids: RefreshSessionIds }
  | { kind: "grace"; ids: RefreshSessionIds; rotatedAt: Date }
  | { kind: "reuse" }
  | { kind: "invalid" };

export function decideRotation(
  session: Pick<
    RefreshSession,
    | "userId"
    | "currentJti"
    | "previousJti"
    | "rotatedAt"
    | "expiresAt"
    | "revokedAt"
  > | null,
  userId: number,
  jti: string,
  now: Date,
): RotationDecision {
  if (
    !session ||
    session.userId !== userId ||
    session.revokedAt ||
    session.expiresAt.getTime() <= now.getTime()
  ) {
    return { kind: "invalid" };
  }
  if (jti === session.currentJti) {
    return { kind: "rotate" };
  }
  if (
    jti === session.previousJti &&
    session.rotatedAt &&
    now.getTime() - session.rotatedAt.getTime() <= REFRESH_GRACE_MS
  ) {
    return { kind: "grace" };
  }
  return { kind: "reuse" };
}

// Revoked rows are kept until they expire so a later replay is still logged as reuse.
export async function deleteExpiredRefreshSessions(
  manager: EntityManager,
  now: Date = new Date(),
): Promise<number> {
  const result = await manager
    .createQueryBuilder()
    .delete()
    .from(RefreshSession)
    .where("expires_at < :now", { now })
    .execute();
  return result.affected ?? 0;
}

export async function createRefreshSession(
  manager: EntityManager,
  userId: number,
  now: Date = new Date(),
): Promise<RefreshSessionIds> {
  const session = await manager.save(
    new RefreshSession({
      id: randomUUID(),
      userId,
      currentJti: randomUUID(),
      previousJti: null,
      rotatedAt: null,
      expiresAt: new Date(now.getTime() + REFRESH_LIFESPAN_MS),
      revokedAt: null,
    }),
  );
  return { sid: session.id, jti: session.currentJti };
}

// The row lock makes exactly one concurrent refresh rotate; the rest hit the grace window.
export async function rotateRefreshSession(
  manager: EntityManager,
  userId: number,
  { sid, jti }: RefreshSessionIds,
  now: Date = new Date(),
): Promise<RotationResult> {
  return manager.transaction(async (tx) => {
    const session = await tx.findOne(RefreshSession, {
      where: { id: sid },
      lock: { mode: "pessimistic_write" },
    });
    const decision = decideRotation(session, userId, jti, now);
    switch (decision.kind) {
      case "invalid":
        return { kind: "invalid" };
      case "reuse":
        await tx.update(RefreshSession, { id: sid }, { revokedAt: now });
        return { kind: "reuse" };
      case "grace":
        return {
          kind: "grace",
          ids: { sid, jti: session!.currentJti },
          rotatedAt: session!.rotatedAt!,
        };
      case "rotate": {
        const nextJti = randomUUID();
        await tx.update(
          RefreshSession,
          { id: sid },
          {
            previousJti: jti,
            currentJti: nextJti,
            rotatedAt: now,
            expiresAt: new Date(now.getTime() + REFRESH_LIFESPAN_MS),
          },
        );
        return { kind: "rotated", ids: { sid, jti: nextJti } };
      }
    }
  });
}

export async function revokeRefreshSession(
  manager: EntityManager,
  userId: number,
  sid: string,
  now: Date = new Date(),
): Promise<void> {
  await manager.update(
    RefreshSession,
    { id: sid, userId, revokedAt: IsNull() },
    { revokedAt: now },
  );
}

export async function revokeUserRefreshSessions(
  manager: EntityManager,
  userId: number,
  exceptSid?: string,
  now: Date = new Date(),
): Promise<void> {
  await manager.update(
    RefreshSession,
    {
      userId,
      revokedAt: IsNull(),
      ...(exceptSid ? { id: Not(exceptSid) } : {}),
    },
    { revokedAt: now },
  );
}
