import { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import {
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

async function attempt(cap: ReturnType<typeof createLoginIpCap>, ip: string) {
  const reply = replyStub();
  await cap(request(ip), reply as unknown as FastifyReply);
  return reply.statusCode;
}

describe("login rate limit", () => {
  it("keys by normalized email, else by IP", () => {
    expect(loginRateLimitKey(request("10.0.0.1", { email: " A@X.org " }))).toBe(
      "login-email:a@x.org",
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

  it("stays bounded by evicting the oldest tracked IP", async () => {
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
});
