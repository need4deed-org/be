import { FastifyInstance } from "fastify";
import { UnauthenticatedError } from "../../../config";

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
