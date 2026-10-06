import { createHash } from "node:crypto";
import { FastifyRequest } from "fastify";
import { ApiAuthRefreshPost } from "need4deed-sdk";
import { refreshCookieName } from "../../config/constants";

// Per session rather than per IP: behind the fe proxy all users can share one
// IP, and one busy moment would rate-limit everyone's refresh.
export function refreshRateLimitKey(request: FastifyRequest): string {
  const token =
    (request.body as ApiAuthRefreshPost | undefined)?.refresh ??
    request.cookies?.[refreshCookieName];
  if (!token) {
    return `refresh-ip:${request.ip}`;
  }
  return `refresh:${createHash("sha256").update(token).digest("hex")}`;
}
