import { normalizeIP } from "@fastify/rate-limit";
import { FastifyReply, FastifyRequest } from "fastify";
import logger from "../../logger";

const LOGIN_IP_MAX = 30;
const LOGIN_ACCOUNT_MAX = 50;
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_MAX_TRACKED = 5000;

const clientIp = (request: FastifyRequest) => normalizeIP(request.ip, 56);

function loginEmail(request: FastifyRequest): string | undefined {
  const email = (request.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && email.trim()
    ? email.trim().toLowerCase()
    : undefined;
}

export function loginRateLimitKey(request: FastifyRequest): string {
  const email = loginEmail(request);
  const ip = clientIp(request);
  return email ? `login-email-ip:${email}:${ip}` : `login-ip:${ip}`;
}

// @fastify/rate-limit runs only one limiter per request, so these caps count separately.
function createLoginCap(
  max: number,
  keyOf: (request: FastifyRequest) => string | undefined,
  reason: string,
) {
  const windows = new Map<string, { count: number; startedAt: number }>();

  return async function loginCap(request: FastifyRequest, reply: FastifyReply) {
    const key = keyOf(request);
    if (key === undefined) {
      return;
    }
    const now = Date.now();
    const window = windows.get(key);
    if (!window || now - window.startedAt >= LOGIN_WINDOW_MS) {
      windows.delete(key);
      if (windows.size >= LOGIN_MAX_TRACKED) {
        windows.delete(windows.keys().next().value!);
      }
      windows.set(key, { count: 1, startedAt: now });
      return;
    }
    windows.delete(key);
    windows.set(key, window);
    window.count += 1;
    if (window.count > max) {
      logger.warn(`Login failed: ${reason}`);
      const retryAfterMs = window.startedAt + LOGIN_WINDOW_MS - now;
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

export const createLoginIpCap = () =>
  createLoginCap(LOGIN_IP_MAX, clientIp, "rate-limited-ip");

export const createLoginAccountCap = () =>
  createLoginCap(LOGIN_ACCOUNT_MAX, loginEmail, "rate-limited-account");
