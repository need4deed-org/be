import { FastifyReply, FastifyRequest } from "fastify";
import { UserRole } from "need4deed-sdk";
import { maskPii } from "./mask";
import { CallerVisibility, resolveCallerVisibility } from "./visible-persons";

type Envelope = { message?: string; data?: unknown; count?: number };

/**
 * What this caller may see UNMASKED, or `null` when no masking applies
 * (COORDINATOR/ADMIN or unauthenticated). For routes that build DTOs in
 * helpers — pass this through and `maskPii(entity, ctx)` before serializing.
 */
export async function resolveCallerMask(
  request: FastifyRequest,
): Promise<CallerVisibility | null> {
  const user = request.authUser;
  const privileged =
    user?.role === UserRole.COORDINATOR || user?.role === UserRole.ADMIN;
  if (!user || privileged) {
    return null;
  }
  return resolveCallerVisibility(request.server, user);
}

/**
 * Masks the PII the caller may not see (persons/addresses, an opportunity's
 * accompanying, comments), in place, on `data`. No-op for COORDINATOR/ADMIN and
 * unauthenticated requests. Use directly in handlers whose DTO needs extra
 * (handler-computed) args; otherwise prefer the `makePiiSerialization` hook.
 */
export async function maskForCaller(
  request: FastifyRequest,
  data: unknown,
): Promise<void> {
  if (data === null || data === undefined) {
    return;
  }
  const visibility = await resolveCallerMask(request);
  if (visibility) {
    maskPii(data, visibility);
  }
}

/**
 * Per-route `preSerialization` hook. The handler sends the loaded entity graph
 * as `data`; this masks the PII the caller may not see, then runs the route's
 * DTO. COORDINATOR/ADMIN (and unauthenticated/error payloads) pass through
 * untouched. List vs single is detected from `data`.
 */
export function makePiiSerialization<TEntity, TDto>(
  dto: (entity: TEntity) => TDto,
) {
  return async function piiPreSerialization(
    request: FastifyRequest,
    _reply: FastifyReply,
    payload: Envelope,
  ): Promise<Envelope> {
    // Error/empty replies ({ message } with no data) — nothing to serialize.
    if (!payload || payload.data === null || payload.data === undefined) {
      return payload;
    }

    await maskForCaller(request, payload.data);

    const data = Array.isArray(payload.data)
      ? (payload.data as TEntity[]).map(dto)
      : dto(payload.data as TEntity);

    return { ...payload, data };
  };
}
