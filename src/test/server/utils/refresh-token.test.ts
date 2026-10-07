import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { refreshCookieName } from "../../../config/constants";
import {
  getRefreshPayload,
  getRefreshToken,
  refreshRateLimitKey,
} from "../../../server/utils/refresh-token";

// "refresh-<id>-..." verifies as a refresh token, "access-<id>-..." as an
// access token; anything else fails verification.
let verifyCalls = 0;
const verify = (token: string) => {
  verifyCalls += 1;
  const match = token.match(/^(refresh|access)-(\d+)/);
  if (!match) {
    throw new Error("invalid");
  }
  return { id: Number(match[2]), email: "x@example.org", type: match[1] };
};

const request = (props: Partial<FastifyRequest>) =>
  ({
    ip: "10.0.0.1",
    server: { jwt: { verify } },
    ...props,
  }) as unknown as FastifyRequest;

const withCookie = (token: string, body?: unknown) =>
  request({ cookies: { [refreshCookieName]: token }, body });

describe("refresh token helpers", () => {
  it("keys two users behind the same IP separately", () => {
    expect(refreshRateLimitKey(withCookie("refresh-1"))).toBe("refresh-user:1");
    expect(refreshRateLimitKey(withCookie("refresh-2"))).toBe("refresh-user:2");
  });

  it("keeps one user's key across rotated tokens", () => {
    expect(refreshRateLimitKey(withCookie("refresh-1-old"))).toBe(
      refreshRateLimitKey(withCookie("refresh-1-new")),
    );
  });

  it("puts non-refresh, made-up and missing tokens in the IP bucket", () => {
    for (const token of ["access-1", "garbage"]) {
      expect(refreshRateLimitKey(withCookie(token))).toBe(
        "refresh-ip:10.0.0.1",
      );
    }
    expect(refreshRateLimitKey(request({ cookies: {} }))).toBe(
      "refresh-ip:10.0.0.1",
    );
    expect(getRefreshPayload(withCookie("access-1"))).toBeNull();
  });

  it("treats an empty body token as missing, like the handler", () => {
    const req = withCookie("refresh-3", { refresh: "" });
    expect(getRefreshToken(req)).toBe("refresh-3");
    expect(refreshRateLimitKey(req)).toBe("refresh-user:3");
  });

  it("prefers a non-empty body token over the cookie", () => {
    expect(
      getRefreshToken(withCookie("refresh-3", { refresh: "refresh-4" })),
    ).toBe("refresh-4");
  });

  it("verifies once per request and token", () => {
    const req = withCookie("refresh-5") as FastifyRequest & { body?: unknown };
    verifyCalls = 0;
    getRefreshPayload(req);
    getRefreshPayload(req);
    expect(verifyCalls).toBe(1);

    // The limiter runs before the body is parsed; a body token seen later by
    // the handler must not reuse the cookie's result.
    req.body = { refresh: "refresh-6" };
    expect(getRefreshPayload(req)?.id).toBe(6);
  });
});
