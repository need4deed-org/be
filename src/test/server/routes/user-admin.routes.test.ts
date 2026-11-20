import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { IsNull } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { accessCookieName } from "../../../config/constants";
import ApiKey from "../../../data/entity/api-key.entity";
import Deal from "../../../data/entity/deal.entity";
import Person from "../../../data/entity/person.entity";
import RefreshSession from "../../../data/entity/refresh-session.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getPostcode, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("admin account actions", () => {
  let fastify: FastifyInstance;
  let adminCookie: string;
  let coordinatorCookie: string;
  let admin: User;
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];

  async function createAccount(role: UserRole, isActive = true) {
    const suffix = randomNumericSuffix();
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Admin", lastName: `Test-${suffix}` }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `admin-actions-${role}-${suffix}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    return user;
  }

  async function login(user: User): Promise<string> {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    const cookie = response.cookies.find(
      ({ name }) => name === accessCookieName,
    );
    if (!cookie) {
      throw new Error("login failed");
    }
    return cookie.value;
  }

  function send(
    method: "POST" | "PATCH" | "DELETE",
    url: string,
    cookie = adminCookie,
    payload?: object,
  ) {
    return fastify.inject({
      method,
      url,
      payload,
      cookies: { [accessCookieName]: cookie },
    });
  }

  function reload(user: User) {
    return fastify.db.userRepository.findOneByOrFail({ id: user.id });
  }

  function openSessions(user: User) {
    return fastify.db.userRepository.manager.count(RefreshSession, {
      where: { userId: user.id, revokedAt: IsNull() },
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    admin = await createAccount(UserRole.ADMIN);
    adminCookie = await login(admin);
    coordinatorCookie = await login(await createAccount(UserRole.COORDINATOR));
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete(createdUserIds);
    await fastify.db.personRepository.delete(createdPersonIds);
    await fastify.close();
  });

  it("is for admins only", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const response = await send(
      "POST",
      `/user/${target.id}/deactivate`,
      coordinatorCookie,
    );
    expect(response.statusCode).toBe(403);
  });

  it("deactivates an account and ends its sessions", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    await login(target);
    expect(await openSessions(target)).toBeGreaterThan(0);

    const response = await send("POST", `/user/${target.id}/deactivate`);

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data).toMatchObject({
      id: target.id,
      isActive: false,
    });
    expect((await reload(target)).deactivatedAt).not.toBeNull();
    expect(await openSessions(target)).toBe(0);
  });

  it("refuses an action on your own account", async () => {
    const response = await send("POST", `/user/${admin.id}/deactivate`);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("self");
  });

  it("refuses volunteer accounts", async () => {
    const volunteer = await createAccount(UserRole.VOLUNTEER);
    const response = await send("POST", `/user/${volunteer.id}/deactivate`);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("not_manageable");
  });

  it("reactivates a deactivated account", async () => {
    const target = await createAccount(UserRole.AGENT);
    await send("POST", `/user/${target.id}/deactivate`);

    const response = await send("POST", `/user/${target.id}/reactivate`);

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.isActive).toBe(true);
    expect((await reload(target)).deactivatedAt).toBeNull();
  });

  it("refuses to reactivate an account that isn't deactivated", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const response = await send("POST", `/user/${target.id}/reactivate`);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("not_deactivated");
  });

  it("deletes an account: erases its personal data, never reactivates", async () => {
    const target = await createAccount(UserRole.COORDINATOR);

    const response = await send("DELETE", `/user/${target.id}`);

    expect(response.statusCode, response.body).toBe(200);
    const erased = await reload(target);
    expect(erased).toMatchObject({ isActive: false });
    expect(erased.email).toMatch(/@erased\.need4deed\.org$/);
    const person = await fastify.db.personRepository.findOneByOrFail({
      id: target.personId!,
    });
    expect(person).toMatchObject({ firstName: "[deleted]", lastName: null });

    const reactivate = await send("POST", `/user/${target.id}/reactivate`);
    expect(reactivate.json().code).toBe("erased");
  });

  it("still lets only you delete your own account as a non-admin", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const response = await send(
      "DELETE",
      `/user/${target.id}`,
      coordinatorCookie,
    );
    expect(response.statusCode).toBe(403);
  });

  it("sends the password reset email, without showing a password", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const passwordReset = vi
      .spyOn(fastify.notify, "passwordReset")
      .mockResolvedValue(undefined);

    const response = await send("POST", `/user/${target.id}/password-reset`);

    expect(response.statusCode, response.body).toBe(200);
    expect(passwordReset).toHaveBeenCalledWith(
      expect.objectContaining({ id: target.id }),
    );
    passwordReset.mockRestore();
  });

  it("refuses a password reset for a deactivated account", async () => {
    const target = await createAccount(UserRole.COORDINATOR, false);
    const response = await send("POST", `/user/${target.id}/password-reset`);
    expect(response.statusCode).toBe(400);
  });

  it("switches a coordinator to admin and ends their sessions", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    await login(target);

    const response = await send("PATCH", `/user/${target.id}/role`, undefined, {
      role: UserRole.ADMIN,
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.role).toBe(UserRole.ADMIN);
    expect((await reload(target)).role).toBe(UserRole.ADMIN);
    expect(await openSessions(target)).toBe(0);
  });

  it("refuses to switch an NGO account to a staff role", async () => {
    const target = await createAccount(UserRole.AGENT);
    const response = await send("PATCH", `/user/${target.id}/role`, undefined, {
      role: UserRole.COORDINATOR,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("role_not_assignable");
  });

  it("refuses a role an admin can't assign", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const response = await send("PATCH", `/user/${target.id}/role`, undefined, {
      role: UserRole.VOLUNTEER,
    });
    expect(response.statusCode).toBe(400);
  });

  it("refuses to deactivate an account that was never verified", async () => {
    const target = await createAccount(UserRole.AGENT, false);
    const response = await send("POST", `/user/${target.id}/deactivate`);
    expect(response.statusCode).toBe(400);
    expect((await reload(target)).deactivatedAt).toBeNull();
  });

  it("keeps the first deactivation time when deactivating twice", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    await send("POST", `/user/${target.id}/deactivate`);
    const { deactivatedAt } = await reload(target);

    const response = await send("POST", `/user/${target.id}/deactivate`);

    expect(response.statusCode, response.body).toBe(200);
    expect((await reload(target)).deactivatedAt).toEqual(deactivatedAt);
  });

  it("refuses deactivate, role change and delete on an erased account", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    await send("DELETE", `/user/${target.id}`);

    const responses = [
      await send("POST", `/user/${target.id}/deactivate`),
      await send("PATCH", `/user/${target.id}/role`, undefined, {
        role: UserRole.ADMIN,
      }),
      await send("DELETE", `/user/${target.id}`),
    ];

    for (const response of responses) {
      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("erased");
    }
  });

  it("deletes every staff/NGO login of the person and revokes their API keys", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const sameUser = await fastify.db.userRepository.save(
      new User({
        email: `admin-actions-same-person-${randomNumericSuffix()}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role: UserRole.AGENT,
        isActive: true,
        personId: target.personId,
      }),
    );
    createdUserIds.push(sameUser.id);
    const apiKey = await fastify.db.apiKeyRepository.save(
      new ApiKey({
        label: `admin-actions-${randomNumericSuffix()}`,
        keyHash: `hash-${randomNumericSuffix()}`,
        userId: sameUser.id,
      }),
    );

    try {
      const response = await send("DELETE", `/user/${target.id}`);

      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().message).not.toMatch(/agent-membership/);
      const other = await reload(sameUser);
      expect(other.isActive).toBe(false);
      expect(other.email).toMatch(/@erased\.need4deed\.org$/);
      const key = await fastify.db.apiKeyRepository.findOneByOrFail({
        id: apiKey.id,
      });
      expect(key.revokedAt).not.toBeNull();
    } finally {
      await fastify.db.apiKeyRepository.delete({ id: apiKey.id });
    }
  });

  it("refuses to delete an account whose person shares your own login", async () => {
    const target = await fastify.db.userRepository.save(
      new User({
        email: `admin-actions-own-person-${randomNumericSuffix()}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role: UserRole.AGENT,
        isActive: true,
        personId: admin.personId,
      }),
    );
    createdUserIds.push(target.id);

    const response = await send("DELETE", `/user/${target.id}`);

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("self");
    expect((await reload(target)).isActive).toBe(true);
  });

  it("refuses to delete an account whose person has a volunteer profile", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const postcode = await getPostcode("10115");
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ personId: target.personId!, dealId: deal.id }),
    );

    try {
      const response = await send("DELETE", `/user/${target.id}`);

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("not_manageable");
      expect((await reload(target)).isActive).toBe(true);
    } finally {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
  });

  it("voids a reset link sent before the account was deleted", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const token = fastify.jwt.sign({
      id: target.id,
      email: target.email,
      type: "reset",
    });
    await send("DELETE", `/user/${target.id}`);

    const response = await fastify.inject({
      method: "POST",
      url: "/auth/password-reset",
      payload: { token, newPassword: "newpass123456" },
    });

    expect(response.statusCode).toBe(400);
  });
});
