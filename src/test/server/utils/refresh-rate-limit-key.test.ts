import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { refreshCookieName } from "../../../config/constants";
import { refreshRateLimitKey } from "../../../server/utils/refresh-rate-limit-key";

const request = (props: Partial<FastifyRequest>) =>
  ({ ip: "10.0.0.1", ...props }) as FastifyRequest;

describe("refreshRateLimitKey()", () => {
  it("gives two sessions behind the same IP different keys", () => {
    const a = refreshRateLimitKey(
      request({ cookies: { [refreshCookieName]: "token-a" } }),
    );
    const b = refreshRateLimitKey(
      request({ cookies: { [refreshCookieName]: "token-b" } }),
    );
    expect(a).not.toBe(b);
    expect(a).not.toContain("token-a");
  });

  it("keys a body token like the same cookie token", () => {
    expect(refreshRateLimitKey(request({ body: { refresh: "token-a" } }))).toBe(
      refreshRateLimitKey(
        request({ cookies: { [refreshCookieName]: "token-a" } }),
      ),
    );
  });

  it("falls back to the IP without a token", () => {
    expect(refreshRateLimitKey(request({ cookies: {} }))).toBe(
      "refresh-ip:10.0.0.1",
    );
  });
});
