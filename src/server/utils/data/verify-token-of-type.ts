import { FastifyInstance } from "fastify";
import { UnauthenticatedError } from "../../../config";

// Shared "verify JWT signature/expiry, then check its type claim" step used
// by every token-in-querystring auth flow (agent/volunteer register,
// coordinator invite) — that part is identical across all of them; what each
// flow does with the payload afterward (look up a User by id, or use the
// payload's own claims directly) differs, so callers still do their own
// resolution (be#1008 review — this used to be copy-pasted three times).
export async function verifyTokenOfType<T extends object>(
  fastify: FastifyInstance,
  token: string | undefined,
  expectedType: string,
  expiredMessage: string,
  wrongTypeMessage: string,
): Promise<T> {
  let payload: T;
  try {
    payload = await fastify.jwt.verify<T>(token as string);
  } catch {
    throw new UnauthenticatedError(expiredMessage);
  }

  if ((payload as { type?: unknown }).type !== expectedType) {
    throw new UnauthenticatedError(wrongTypeMessage);
  }

  return payload;
}
