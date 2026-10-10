import { FastifyReply, FastifyRequest } from "fastify";
import { isStaffRole } from "../data/is-staff-role";
import { maskPii } from "./mask";
import { CallerVisibility, resolveCallerVisibility } from "./visible-persons";

type Envelope = { message?: string; data?: unknown; count?: number };

export async function resolveCallerMask(
  request: FastifyRequest,
): Promise<CallerVisibility | null> {
  const user = request.authUser;
  const privileged = isStaffRole(user?.role);
  if (!user || privileged) {
    return null;
  }
  return resolveCallerVisibility(request, user);
}

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

export function makePiiSerialization<TEntity, TDto>(
  dto: (entity: TEntity) => TDto,
) {
  return async function piiPreSerialization(
    request: FastifyRequest,
    _reply: FastifyReply,
    payload: Envelope,
  ): Promise<Envelope> {
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
