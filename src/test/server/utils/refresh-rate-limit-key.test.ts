import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { refreshCookieName } from "../../../config/constants";
import { refreshRateLimitKey } from "../../../server/utils/refresh-rate-limit-key";

const verify = (token: string) => {
  const match = token.match(/^valid-(\d+)/);
  if (!match) {
    throw new Error("invalid");
  }
  return { id: Number(match[1]) };
};

const request = (props: Partial<FastifyRequest>) =>
  ({
    ip: "10.0.0.1",
    server: { jwt: { verify } },
    ...props,
  }) as unknown as FastifyRequest;

const withCookie = (token: string) =>
  request({ cookies: { [refreshCookieName]: token } });

describe("refreshRateLimitKey()", () => {
  it("keys two users behind the same IP separately", () => {
    expect(refreshRateLimitKey(withCookie("valid-1"))).toBe("refresh-user:1");
    expect(refreshRateLimitKey(withCookie("valid-2"))).toBe("refresh-user:2");
  });

  it("keeps one user's key across rotated tokens", () => {
    expect(refreshRateLimitKey(withCookie("valid-1-old"))).toBe(
      refreshRateLimitKey(withCookie("valid-1-new")),
    );
  });

  it("reads a body token like a cookie token", () => {
    expect(refreshRateLimitKey(request({ body: { refresh: "valid-3" } }))).toBe(
      "refresh-user:3",
    );
  });

  it("puts made-up tokens and missing tokens in the IP bucket", () => {
    expect(refreshRateLimitKey(withCookie("garbage-a"))).toBe(
      "refresh-ip:10.0.0.1",
    );
    expect(refreshRateLimitKey(withCookie("garbage-b"))).toBe(
      "refresh-ip:10.0.0.1",
    );
    expect(refreshRateLimitKey(request({ cookies: {} }))).toBe(
      "refresh-ip:10.0.0.1",
    );
  });
});
