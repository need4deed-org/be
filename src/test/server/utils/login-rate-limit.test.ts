import { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import {
  createLoginAccountCap,
  createLoginIpCap,
  loginRateLimitKey,
} from "../../../server/utils/login-rate-limit";

const request = (ip: string, body?: unknown) =>
  ({ ip, body }) as unknown as FastifyRequest;

function replyStub() {
  const reply = {
    statusCode: 200,
    header: () => reply,
    status: (code: number) => {
      reply.statusCode = code;
      return reply;
    },
    send: () => reply,
  };
  return reply;
}

async function attempt(
  cap: ReturnType<typeof createLoginIpCap>,
  ip: string,
  body?: unknown,
) {
  const reply = replyStub();
  await cap(request(ip, body), reply as unknown as FastifyReply);
  return reply.statusCode;
}

describe("login rate limit", () => {
  it("keys by normalized email and IP, else by IP", () => {
    expect(loginRateLimitKey(request("10.0.0.1", { email: " A@X.org " }))).toBe(
      "login-email-ip:a@x.org:10.0.0.1",
    );
    expect(
      loginRateLimitKey(request("2001:db8:aa:bb00::1", { email: "a@x.org" })),
    ).toBe(
      loginRateLimitKey(request("2001:db8:aa:bbff::2", { email: "a@x.org" })),
    );
    expect(loginRateLimitKey(request("10.0.0.1", {}))).toBe(
      "login-ip:10.0.0.1",
    );
  });

  it("caps an IP at 30 per window", async () => {
    const cap = createLoginIpCap();
    for (let i = 0; i < 30; i++) {
      expect(await attempt(cap, "10.0.0.1")).toBe(200);
    }
    expect(await attempt(cap, "10.0.0.1")).toBe(429);
    expect(await attempt(cap, "10.0.0.2")).toBe(200);
  });

  it("stays bounded by evicting the least recently used IP", async () => {
    const cap = createLoginIpCap();
    for (let i = 0; i < 31; i++) {
      await attempt(cap, "10.0.0.1");
    }
    expect(await attempt(cap, "10.0.0.1")).toBe(429);

    for (let i = 0; i < 5000; i++) {
      await attempt(cap, `10.1.${Math.floor(i / 256)}.${i % 256}`);
    }
    expect(await attempt(cap, "10.0.0.1")).toBe(200);
  });

  it("keeps a key that is still being hit while others flood in", async () => {
    const cap = createLoginIpCap();
    for (let i = 0; i < 31; i++) {
      await attempt(cap, "10.0.0.1");
    }
    for (let i = 0; i < 5000; i++) {
      await attempt(cap, `10.1.${Math.floor(i / 256)}.${i % 256}`);
      if (i % 1000 === 0) {
        await attempt(cap, "10.0.0.1");
      }
    }
    expect(await attempt(cap, "10.0.0.1")).toBe(429);
  });

  it("caps an account at 50 per window across IPs, ignoring case", async () => {
    const cap = createLoginAccountCap();
    for (let i = 0; i < 50; i++) {
      expect(
        await attempt(cap, `10.0.0.${i}`, {
          email: i % 2 ? "A@X.org" : "a@x.org",
        }),
      ).toBe(200);
    }
    expect(await attempt(cap, "10.0.1.1", { email: "a@x.org" })).toBe(429);
    expect(await attempt(cap, "10.0.1.1", { email: "b@x.org" })).toBe(200);
  });

  it("leaves the account cap to the IP cap when there is no email", async () => {
    const cap = createLoginAccountCap();
    for (let i = 0; i < 60; i++) {
      expect(await attempt(cap, "10.0.0.1", {})).toBe(200);
    }
  });
});
