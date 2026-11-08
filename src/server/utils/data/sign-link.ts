import { FastifyInstance } from "fastify";
import { ApiSignedLinkResponse } from "need4deed-sdk";

export function signLink(
  fastify: FastifyInstance,
  payload: Parameters<FastifyInstance["jwt"]["sign"]>[0],
  lifespanMs: number,
  baseUrl: string,
  param: string,
): ApiSignedLinkResponse {
  const token = fastify.jwt.sign(payload, { expiresIn: `${lifespanMs}` });
  const { exp } = fastify.jwt.decode<{ exp: number }>(token)!;
  return {
    token,
    link: `${baseUrl}?${param}=${encodeURIComponent(token)}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}
