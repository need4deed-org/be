import { normalizeIP } from "@fastify/rate-limit";
import { FastifyReply, FastifyRequest } from "fastify";
import logger from "../../logger";

const LOGIN_IP_MAX = 30;
const LOGIN_IP_WINDOW_MS = 60 * 1000;
const LOGIN_IP_MAX_TRACKED = 5000;

export function loginRateLimitKey(request: FastifyRequest): string {
  const email = (request.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && email.trim()
    ? `login-email:${email.trim().toLowerCase()}`
    : `login-ip:${normalizeIP(request.ip, 56)}`;
}

// @fastify/rate-limit runs only one limiter per request, so this per-IP cap
// on top of the per-account limit is its own fixed-window counter.
export function createLoginIpCap() {
  const windows = new Map<string, { count: number; startedAt: number }>();

  return async function loginIpCap(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const now = Date.now();
    const ip = normalizeIP(request.ip, 56);
    const window = windows.get(ip);
    if (!window || now - window.startedAt >= LOGIN_IP_WINDOW_MS) {
      windows.delete(ip);
      if (windows.size >= LOGIN_IP_MAX_TRACKED) {
        windows.delete(windows.keys().next().value!);
      }
      windows.set(ip, { count: 1, startedAt: now });
      return;
    }
    window.count += 1;
    if (window.count > LOGIN_IP_MAX) {
      logger.warn("Login failed: rate-limited-ip");
      const retryAfterMs = window.startedAt + LOGIN_IP_WINDOW_MS - now;
      return reply
        .header("retry-after", Math.ceil(retryAfterMs / 1000))
        .status(429)
        .send({
          statusCode: 429,
          error: "Too Many Requests",
          message: "Rate limit exceeded",
        });
    }
  };
}
