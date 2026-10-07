import { normalizeIP } from "@fastify/rate-limit";
import { FastifyRequest } from "fastify";
import { ApiAuthRefreshPost } from "need4deed-sdk";
import { cookieOptions, refreshCookieName } from "../../config/constants";

type RefreshPayload = { id: number; email: string; type: "refresh" };

const verified = new WeakMap<
  FastifyRequest,
  { token: string; payload: RefreshPayload | null }
>();

// One source order for the rate limiter and the handler: a non-empty body
// token, else the refresh cookie (unsigned when cookies are signed).
export function getRefreshToken(request: FastifyRequest): string | undefined {
  const fromBody = (request.body as ApiAuthRefreshPost | undefined)?.refresh;
  if (fromBody) {
    return fromBody;
  }
  const raw = request.cookies?.[refreshCookieName];
  if (!raw) {
    return undefined;
  }
  if (!cookieOptions.signed) {
    return raw;
  }
  const { valid, value } = request.unsignCookie(raw);
  return valid && value ? value : undefined;
}

// The verified refresh-token payload, or null for a missing, invalid or
// non-refresh token. Verified once per request and token.
export function getRefreshPayload(
  request: FastifyRequest,
): RefreshPayload | null {
  const token = getRefreshToken(request);
  if (!token) {
    return null;
  }
  const cached = verified.get(request);
  if (cached?.token === token) {
    return cached.payload;
  }
  let payload: RefreshPayload | null = null;
  try {
    const decoded = request.server.jwt.verify<Partial<RefreshPayload>>(token);
    if (decoded?.type === "refresh" && decoded.id && decoded.email) {
      payload = decoded as RefreshPayload;
    }
  } catch {
    // Invalid or expired: no payload.
  }
  verified.set(request, { token, payload });
  return payload;
}

// Per user rather than per IP: behind the fe proxy all users can share one IP.
// Anything without a valid refresh token shares a bucket per IP (/56 for IPv6).
export function refreshRateLimitKey(request: FastifyRequest): string {
  const id = getRefreshPayload(request)?.id;
  return id
    ? `refresh-user:${id}`
    : `refresh-ip:${normalizeIP(request.ip, 56)}`;
}
