import { FastifyRequest } from "fastify";
import { resolveCallerMask } from "./pre-serialization";

export async function canSeeOwnAddress(
  request: FastifyRequest,
  opportunityId: number,
): Promise<boolean> {
  const visibility = await resolveCallerMask(request);
  return visibility === null || visibility.opportunityIds.has(opportunityId);
}
