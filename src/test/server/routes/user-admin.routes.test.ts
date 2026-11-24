import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, EventN4DType, UserRole } from "need4deed-sdk";
import { IsNull } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { accessCookieName, refreshCookieName } from "../../../config/constants";
import ApiKey from "../../../data/entity/api-key.entity";
import Deal from "../../../data/entity/deal.entity";
import EventTranslation from "../../../data/entity/event/event_translation.entity";
import EventN4D from "../../../data/entity/event/event.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
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

  async function loginCookies(user: User) {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    const cookie = (cookieName: string) => {
      const found = response.cookies.find(({ name }) => name === cookieName);
      if (!found) {
        throw new Error("login failed");
      }
      return found.value;
    };
    return {
      access: cookie(accessCookieName),
      refresh: cookie(refreshCookieName),
    };
  }

  async function login(user: User): Promise<string> {
    return (await loginCookies(user)).access;
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
    expect(response.json().data.deactivatedAt).toEqual(expect.any(String));
    const reloaded = await reload(target);
    expect(reloaded.deactivatedAt).not.toBeNull();
    expect(reloaded.credentialsValidAfter).toEqual(reloaded.deactivatedAt);
    expect(await openSessions(target)).toBe(0);
  });

  describe("credentials issued before a deactivation", () => {
    function signReset(user: User) {
      return fastify.jwt.sign({
        id: user.id,
        email: user.email,
        type: "reset",
      });
    }

    function resetPassword(token: string) {
      return fastify.inject({
        method: "POST",
        url: "/auth/password-reset",
        payload: { token, newPassword: "new_test_password" },
      });
    }

    function getMe(cookie: string) {
      return fastify.inject({
        method: "GET",
        url: "/user/me",
        cookies: { [accessCookieName]: cookie },
      });
    }

    async function deactivateAndReactivate(user: User) {
      await send("POST", `/user/${user.id}/deactivate`);
      await send("POST", `/user/${user.id}/reactivate`);
    }

    it("refuses a reset link after reactivation", async () => {
      const target = await createAccount(UserRole.COORDINATOR);
      const resetToken = signReset(target);
      await deactivateAndReactivate(target);

      const response = await resetPassword(resetToken);

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe("Invalid reset token.");
      expect(await (await reload(target)).checkPassword(PASSWORD)).toBe(true);
    });

    it("refuses an access token after reactivation", async () => {
      const target = await createAccount(UserRole.COORDINATOR);
      const accessToken = await login(target);
      expect((await getMe(accessToken)).statusCode).toBe(200);
      await deactivateAndReactivate(target);

      const response = await getMe(accessToken);

      expect(response.statusCode).toBe(401);
    });

    it("accepts credentials issued after the cutoff", async () => {
      const target = await createAccount(UserRole.COORDINATOR);
      await deactivateAndReactivate(target);
      await fastify.db.userRepository.update(target.id, {
        credentialsValidAfter: new Date(Date.now() - 5_000),
      });

      expect((await getMe(await login(target))).statusCode).toBe(200);
      expect((await resetPassword(signReset(target))).statusCode).toBe(200);
    });

    it("refuses a refresh token issued before the cutoff", async () => {
      const target = await createAccount(UserRole.COORDINATOR);
      const { refresh } = await loginCookies(target);
      await fastify.db.userRepository.update(target.id, {
        credentialsValidAfter: new Date(),
      });

      const response = await fastify.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { [refreshCookieName]: refresh },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe("Invalid refresh token.");
    });

    it("treats an access token from before the cutoff as anonymous on optional-auth routes", async () => {
      const target = await createAccount(UserRole.COORDINATOR);
      const de = await fastify.db.languageRepository.findOneOrFail({
        where: { isoCode: "de" },
      });
      const draft = await fastify.db.eventRepository.save(
        new EventN4D({
          isActive: false,
          date: new Date("2026-01-01T13:00:00Z"),
          type: EventN4DType.WORKSHOP,
          address: "Elsenstraße 87, Berlin",
          languageId: de.id,
        }),
      );
      await fastify.db.eventRepository.manager.save(
        new EventTranslation({
          eventn4dId: draft.id,
          languageId: de.id,
          title: `Entwurf ${randomNumericSuffix()}`,
          menuTitle: "Entwurf",
          description: "Noch nicht veröffentlicht.",
          shortDescription: "Entwurf.",
        }),
      );
      const getDraft = (cookie: string) =>
        fastify.inject({
          method: "GET",
          url: `/event/${draft.id}`,
          cookies: { [accessCookieName]: cookie },
        });

      try {
        const accessToken = await login(target);
        expect((await getDraft(accessToken)).statusCode).toBe(200);
        await deactivateAndReactivate(target);

        expect((await getDraft(accessToken)).statusCode).toBe(404);
      } finally {
        await fastify.db.eventRepository.manager.delete(EventTranslation, {
          eventn4dId: draft.id,
        });
        await fastify.db.eventRepository.delete({ id: draft.id });
      }
    });

    it("ends sessions and API keys when you delete your own account", async () => {
      const target = await createAccount(UserRole.COORDINATOR);
      const accessToken = await login(target);
      const apiKey = await fastify.db.apiKeyRepository.save(
        new ApiKey({
          label: `admin-actions-${randomNumericSuffix()}`,
          keyHash: `hash-${randomNumericSuffix()}`,
          userId: target.id,
        }),
      );

      try {
        const response = await send(
          "DELETE",
          `/user/${target.id}`,
          accessToken,
        );

        expect(response.statusCode, response.body).toBe(200);
        expect(await openSessions(target)).toBe(0);
        const key = await fastify.db.apiKeyRepository.findOneByOrFail({
          id: apiKey.id,
        });
        expect(key.revokedAt).not.toBeNull();
      } finally {
        await fastify.db.apiKeyRepository.delete({ id: apiKey.id });
      }
    });
  });

  it("revokes the account's API keys on deactivate", async () => {
    const target = await createAccount(UserRole.COORDINATOR);
    const apiKey = await fastify.db.apiKeyRepository.save(
      new ApiKey({
        label: `admin-actions-${randomNumericSuffix()}`,
        keyHash: `hash-${randomNumericSuffix()}`,
        userId: target.id,
      }),
    );

    try {
      await send("POST", `/user/${target.id}/deactivate`);
      await send("POST", `/user/${target.id}/reactivate`);

      const key = await fastify.db.apiKeyRepository.findOneByOrFail({
        id: apiKey.id,
      });
      expect(key.revokedAt).not.toBeNull();
    } finally {
      await fastify.db.apiKeyRepository.delete({ id: apiKey.id });
    }
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
    expect(response.json().data.deactivatedAt).toBeNull();
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
    const target = await createAccount(UserRole.COORDINATOR);
    await send("POST", `/user/${target.id}/deactivate`);

    const response = await send("POST", `/user/${target.id}/password-reset`);

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe("Reactivate the account first.");
  });

  it("refuses a password reset for an account that was never verified", async () => {
    const target = await createAccount(UserRole.COORDINATOR, false);
    const response = await send("POST", `/user/${target.id}/password-reset`);
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toBe(
      "This account hasn't been verified yet.",
    );
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

  it("tells the admin about the NGO memberships of a deleted NGO account", async () => {
    const target = await createAccount(UserRole.AGENT);
    const agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Admin Actions NGO ${randomNumericSuffix()}` }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: target.personId!,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    try {
      const response = await send("DELETE", `/user/${target.id}`);

      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().message).toMatch(/1 agent-membership record/);
    } finally {
      await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
      await fastify.db.agentRepository.delete({ id: agent.id });
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

  it.each(["DELETE", "POST"] as const)(
    "voids a reset link sent before the account was deleted/deactivated (%s)",
    async (method) => {
      const target = await createAccount(UserRole.COORDINATOR);
      const token = fastify.jwt.sign({
        id: target.id,
        email: target.email,
        type: "reset",
      });
      await send(
        method,
        method === "DELETE"
          ? `/user/${target.id}`
          : `/user/${target.id}/deactivate`,
      );

      const response = await fastify.inject({
        method: "POST",
        url: "/auth/password-reset",
        payload: { token, newPassword: "newpass123456" },
      });

      expect(response.statusCode).toBe(400);
    },
  );
});
