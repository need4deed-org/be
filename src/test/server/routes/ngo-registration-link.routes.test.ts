import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  ApiAgentRegistrationLinkResponse,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  accessCookieName,
  NGO_REGISTRATION_LIFESPAN_MS,
} from "../../../config/constants";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "admin" | "coordinator";

describe("NGO registration link (be#1318)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const mail = (name: string) =>
    `ngo-link-${name}-${suffix}@test.need4deed.org`;

  let active: Agent;
  let inactive: Agent;
  const cookies = {} as Record<Caller, string>;
  const createdVolunteerIds: number[] = [];

  const createLink = (agentId: number, as: Caller = "admin") =>
    fastify.inject({
      method: "POST",
      url: `/agent/${agentId}/registration-link`,
      cookies: { [accessCookieName]: cookies[as] },
    });

  const signUp = (name: string, ngoToken: string, role = UserRole.VOLUNTEER) =>
    fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: mail(name),
        password: PASSWORD,
        role,
        person: { firstName: "Linked", lastName: `${name}${suffix}` },
        ngoToken,
      },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    vi.spyOn(fastify.notify, "emailVerification").mockResolvedValue(undefined);
    vi.spyOn(fastify.notify, "emailRegistration").mockResolvedValue(undefined);
    vi.spyOn(fastify.notify, "arrival").mockResolvedValue(undefined);

    active = await fastify.db.agentRepository.save(
      new Agent({
        title: `Link Agent active ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    inactive = await fastify.db.agentRepository.save(
      new Agent({
        title: `Link Agent inactive ${suffix}`,
        engagementStatus: AgentEngagementStatusType.INACTIVE,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      admin: UserRole.ADMIN,
      coordinator: UserRole.COORDINATOR,
    };
    for (const [caller, role] of Object.entries(roles) as [
      Caller,
      UserRole,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Linker", lastName: `${caller}${suffix}` }),
      );
      await fastify.db.userRepository.save(
        new User({
          email: mail(caller),
          password: pwHash,
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: mail(caller), password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const volunteers = await fastify.db.volunteerRepository.find({
      where: { id: In(createdVolunteerIds) },
    });
    await fastify.db.volunteerAuditLogRepository.delete({
      volunteerId: In(createdVolunteerIds),
    });
    await fastify.db.volunteerRepository.delete({
      id: In(createdVolunteerIds),
    });
    await fastify.db.dealRepository.delete({
      id: In(volunteers.map(({ dealId }) => dealId)),
    });
    const users = await fastify.db.userRepository.find({
      where: {
        email: In(["admin", "coordinator", "volunteer", "agent"].map(mail)),
      },
    });
    const personIds = users.flatMap(({ personId }) =>
      personId ? [personId] : [],
    );
    await fastify.db.userRepository.delete({
      id: In(users.map(({ id }) => id)),
    });
    const persons = await fastify.db.personRepository.find({
      where: { id: In(personIds) },
    });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    const addressIds = persons.flatMap(({ addressId }) =>
      addressId ? [addressId] : [],
    );
    if (addressIds.length > 0) {
      await fastify.db.personRepository.manager.query(
        "DELETE FROM address WHERE id = ANY($1)",
        [addressIds],
      );
    }
    await fastify.db.agentRepository.delete({
      id: In([active.id, inactive.id]),
    });
    await fastify.close();
  });

  describe("POST /agent/:id/registration-link", () => {
    it("gives an admin a 90-day signed link to the volunteer sign-up page", async () => {
      const res = await createLink(active.id);
      expect(res.statusCode).toBe(201);
      const { token, link, expiresAt }: ApiAgentRegistrationLinkResponse =
        res.json();
      expect(link).toContain(
        `/register/volunteer?ngo=${encodeURIComponent(token)}`,
      );
      const lifespan = new Date(expiresAt).getTime() - Date.now();
      expect(lifespan).toBeGreaterThan(NGO_REGISTRATION_LIFESPAN_MS - 60_000);
      expect(lifespan).toBeLessThanOrEqual(NGO_REGISTRATION_LIFESPAN_MS);
    });

    it("403s a coordinator, 404s an unknown NGO, 400s an inactive one", async () => {
      expect((await createLink(active.id, "coordinator")).statusCode).toBe(403);
      expect((await createLink(2147483000)).statusCode).toBe(404);
      expect((await createLink(inactive.id)).statusCode).toBe(400);
    });
  });

  describe("volunteer sign-up through the link", () => {
    it("carries the NGO through the verification email into the new volunteer", async () => {
      const { token } = (await createLink(active.id)).json();
      const res = await signUp("volunteer", token);
      expect(res.statusCode).toBe(201);
      const user = await fastify.db.userRepository.findOneByOrFail({
        email: mail("volunteer"),
      });
      expect(fastify.notify.emailVerification).toHaveBeenCalledWith(
        expect.objectContaining({ id: user.id }),
        active.id,
      );

      const verify = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        type: "verify",
        ownerAgentId: active.id,
      });
      await fastify.db.userRepository.update(
        { id: user.id },
        { isActive: true },
      );
      const profile = await fastify.inject({
        method: "POST",
        url: `/volunteer/register?token=${verify}`,
        payload: {
          addressPostcode: "10115",
          locations: [],
          languages: [],
          availability: [],
          activities: [],
          skills: [],
          leadFrom: [],
          goodConductCertificate: "undefined",
          measlesVaccination: "undefined",
          comments: "",
        },
      });
      expect(profile.statusCode).toBe(201);
      const volunteerId = profile.json().data.id;
      createdVolunteerIds.push(volunteerId);

      const volunteer = await fastify.db.volunteerRepository.findOneByOrFail({
        id: volunteerId,
      });
      expect(volunteer.ownerAgentId).toBe(active.id);
      const audit =
        await fastify.db.volunteerAuditLogRepository.findOneByOrFail({
          volunteerId,
        });
      expect(audit).toMatchObject({
        type: "owner_changed",
        actorUserId: user.id,
      });
      expect(audit.detail).toContain(active.title);
    });

    it("400s a link that is broken, expired, of another kind, or of an inactive NGO", async () => {
      const expired = fastify.jwt.sign(
        { agentId: active.id, type: "ngo-registration" },
        { expiresIn: "1" },
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      const tokens = [
        "not-a-token",
        expired,
        fastify.jwt.sign({ agentId: active.id, type: "verify" } as never),
        fastify.jwt.sign({ agentId: inactive.id, type: "ngo-registration" }),
      ];
      for (const token of tokens) {
        const res = await signUp("rejected", token);
        expect(res.statusCode).toBe(400);
        expect(res.json().message).toBe(
          "This registration link is no longer valid.",
        );
      }
    });

    it("400s the link on a non-volunteer sign-up", async () => {
      const { token } = (await createLink(active.id)).json();
      expect((await signUp("agent", token, UserRole.AGENT)).statusCode).toBe(
        400,
      );
    });
  });
});
