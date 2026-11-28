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
export function createWindowCap(
  max: number,
  windowMs: number,
  keyOf: (request: FastifyRequest) => string | undefined,
  logMessage: string,
) {
  const windows = new Map<string, { count: number; startedAt: number }>();

  return async function windowCap(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const key = keyOf(request);
    if (key === undefined) {
      return;
    }
    const now = Date.now();
    const window = windows.get(key);
    if (!window || now - window.startedAt >= windowMs) {
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
      logger.warn(logMessage);
      const retryAfterMs = window.startedAt + windowMs - now;
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
  createWindowCap(
    LOGIN_IP_MAX,
    LOGIN_WINDOW_MS,
    clientIp,
    "Login failed: rate-limited-ip",
  );

export const createLoginAccountCap = () =>
  createWindowCap(
    LOGIN_ACCOUNT_MAX,
    LOGIN_WINDOW_MS,
    loginEmail,
    "Login failed: rate-limited-account",
  );

const REGISTER_MAX = 5;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;

export const REGISTER_IP_RATE_LIMIT = {
  max: REGISTER_MAX,
  timeWindow: REGISTER_WINDOW_MS,
  keyGenerator: (request: FastifyRequest) => `register-ip:${clientIp(request)}`,
  onExceeded: () => logger.warn("Register failed: rate-limited-ip"),
};

export const createRegisterEmailCap = () =>
  createWindowCap(
    REGISTER_MAX,
    REGISTER_WINDOW_MS,
    loginEmail,
    "Register failed: rate-limited-email",
  );
