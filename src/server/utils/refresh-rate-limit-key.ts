import { FastifyRequest } from "fastify";
import { ApiAuthRefreshPost } from "need4deed-sdk";
import { refreshCookieName } from "../../config/constants";

// Per user rather than per IP: behind the fe proxy all users can share one IP.
// The id comes from the verified token, so rotating or made-up tokens can't
// reset the count; tokens that don't verify share one bucket per IP.
export function refreshRateLimitKey(request: FastifyRequest): string {
  const token =
    (request.body as ApiAuthRefreshPost | undefined)?.refresh ??
    request.cookies?.[refreshCookieName];
  if (token) {
    try {
      const { id } = request.server.jwt.verify<{ id?: number }>(token);
      if (id) {
        return `refresh-user:${id}`;
      }
    } catch {
      // Falls through to the IP bucket.
    }
  }
  return `refresh-ip:${request.ip}`;
}
