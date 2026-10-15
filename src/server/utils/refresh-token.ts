import { normalizeIP } from "@fastify/rate-limit";
import { FastifyRequest } from "fastify";
import { ApiAuthRefreshPost } from "need4deed-sdk";
import { cookieOptions, refreshCookieName } from "../../config/constants";

export type RefreshPayload = {
  id: number;
  email: string;
  type: "refresh";
  sid: string;
  jti: string;
};

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

type VerifiedRefresh = Omit<RefreshPayload, "sid" | "jti"> &
  Partial<Pick<RefreshPayload, "sid" | "jti">>;

const verified = new WeakMap<
  FastifyRequest,
  { token: string; payload: VerifiedRefresh | null }
>();

function verifyRefreshToken(request: FastifyRequest): VerifiedRefresh | null {
  const token = getRefreshToken(request);
  if (!token) {
    return null;
  }
  const cached = verified.get(request);
  if (cached?.token === token) {
    return cached.payload;
  }
  let payload: VerifiedRefresh | null = null;
  try {
    const decoded = request.server.jwt.verify<Partial<RefreshPayload>>(token);
    if (decoded?.type === "refresh" && decoded.id && decoded.email) {
      payload = decoded as VerifiedRefresh;
    }
  } catch {
    // Invalid or expired: no payload.
  }
  verified.set(request, { token, payload });
  return payload;
}

export function getRefreshPayload(
  request: FastifyRequest,
): RefreshPayload | null {
  const payload = verifyRefreshToken(request);
  return typeof payload?.sid === "string" && typeof payload.jti === "string"
    ? (payload as RefreshPayload)
    : null;
}

// Per user, since behind the fe proxy all users can share one IP; pre-rotation tokens too, so their post-deploy rejections don't exhaust one shared bucket.
export function refreshRateLimitKey(request: FastifyRequest): string {
  const id = verifyRefreshToken(request)?.id;
  return id
    ? `refresh-user:${id}`
    : `refresh-ip:${normalizeIP(request.ip, 56)}`;
}
