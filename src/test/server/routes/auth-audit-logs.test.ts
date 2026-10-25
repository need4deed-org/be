import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

function captureLogs() {
  const spies = (["error", "warn", "info", "debug"] as const).map((level) =>
    vi.spyOn(logger, level),
  );
  return () =>
    spies.flatMap((spy) => spy.mock.calls.map(([line]) => String(line)));
}

async function saveUser(
  fastify: FastifyInstance,
  email: string,
  password: string,
  isActive: boolean,
) {
  return fastify.db.userRepository.save(
    new User({
      email,
      password: await hashPassword(password),
      role: UserRole.VOLUNTEER,
      isActive,
      person: new Person({ firstName: "Audit", lastName: "User", email }),
    }),
  );
}

describe("auth audit logs", () => {
  let fastify: FastifyInstance;
  let active: User;
  let inactive: User;
  const suffix = randomNumericSuffix();
  const email = `auth-audit-${suffix}@example.com`;
  const inactiveEmail = `auth-audit-inactive-${suffix}@example.com`;
  const password = "audit_password";

  const login = (payload: { email: string; password: string }) =>
    fastify.inject({ method: "POST", url: "/auth/login", payload });

  function expectNoSecrets(lines: string[], ...secrets: string[]) {
    for (const line of lines) {
      for (const secret of secrets) {
        expect(line).not.toContain(secret);
      }
    }
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    active = await saveUser(fastify, email, password, true);
    inactive = await saveUser(fastify, inactiveEmail, password, false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ email: active.email });
    await fastify.db.userRepository.delete({ email: inactive.email });
    await fastify.db.personRepository.delete({ email: active.email });
    await fastify.db.personRepository.delete({ email: inactive.email });
    await fastify.close();
  });

  it("logs an empty field", async () => {
    const lines = captureLogs();
    const response = await login({ email, password: "" });
    expect(response.statusCode).toBe(400);
    expect(lines()).toContain("Login failed: empty-field");
    expectNoSecrets(lines(), email);
  });

  it("logs an unknown email without the email", async () => {
    const unknown = `auth-audit-unknown-${suffix}@example.com`;
    const lines = captureLogs();
    const response = await login({ email: unknown, password });
    expect(response.statusCode).toBe(404);
    expect(lines()).toContain("Login failed: unknown-email");
    expectNoSecrets(lines(), unknown, password);
  });

  it("logs an inactive user by id", async () => {
    const lines = captureLogs();
    const response = await login({ email: inactiveEmail, password });
    expect(response.statusCode).toBe(403);
    expect(lines()).toContain(`Login failed for user ${inactive.id}: inactive`);
    expectNoSecrets(lines(), inactiveEmail, password);
  });

  it("logs a wrong password by id", async () => {
    const typed = "typed_wrong_password";
    const lines = captureLogs();
    const response = await login({ email, password: typed });
    expect(response.statusCode).toBe(401);
    expect(lines()).toContain(
      `Login failed for user ${active.id}: wrong-password`,
    );
    expectNoSecrets(lines(), email, typed);
  });

  it("logs logins rejected by the per-account limit", async () => {
    const limited = `auth-audit-limited-${suffix}@example.com`;
    for (let i = 0; i < 10; i++) {
      await login({ email: limited, password });
    }
    const lines = captureLogs();
    const response = await login({ email: limited, password });
    expect(response.statusCode).toBe(429);
    expect(lines()).toContain("Login failed: rate-limited-account");
    expectNoSecrets(lines(), limited, password);
  });

  it("logs a password reset", async () => {
    const lines = captureLogs();
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: {
        token: fastify.jwt.sign({ id: active.id, email, type: "reset" }),
        newPassword: password,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(lines()).toContain(
      `Password set for user ${active.id} via reset-password`,
    );
    expectNoSecrets(lines(), email, password);
  });

  it("logs a password change", async () => {
    const lines = captureLogs();
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-change",
      cookies: {
        access: fastify.jwt.sign({
          id: active.id,
          email,
          role: UserRole.VOLUNTEER,
          type: "access",
        }),
      },
      payload: { password, newPassword: password },
    });
    expect(response.statusCode).toBe(200);
    expect(lines()).toContain(
      `Password set for user ${active.id} via change-password`,
    );
    expectNoSecrets(lines(), email, password);
  });
});

describe("auth audit logs: per-IP login cap", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it("logs logins rejected by the per-IP cap", async () => {
    const suffix = randomNumericSuffix();
    const login = (i: number) =>
      fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: `auth-audit-ip-${suffix}-${i}@example.com`,
          password: "audit_password",
        },
      });
    for (let i = 0; i < 30; i++) {
      await login(i);
    }
    const lines = captureLogs();
    const response = await login(30);
    expect(response.statusCode).toBe(429);
    expect(lines()).toContain("Login failed: rate-limited-ip");
  });
});
