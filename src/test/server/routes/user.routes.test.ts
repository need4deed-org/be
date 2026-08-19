import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

// Regression coverage for two things landed together:
// 1. POST /user's AGENT email-domain gate rejects with InvalidOrganizationEmailError
//    (400), not the old bare NotFoundError (404, "Resource not found").
// 2. The `error` field (the thrown class's name) actually survives response
//    serialization — responseErrors previously only declared `message`, so
//    Fastify's schema-driven serializer silently stripped `error` from every
//    error response using it, regardless of what the error handler sent.
describe("POST /user — AGENT email-domain gate", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const trustedDomain = `trusted-${suffix}.example`;
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain: trustedDomain }),
    );
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    await fastify.db.trustedDomainRepository.delete({ domain: trustedDomain });
    await fastify.close();
  });

  it("rejects an unrecognized/untrusted organization email domain with a distinguishable 400", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: `agent-${suffix}@totally-unknown-domain-${suffix}.example`,
        password: "test_password",
        role: UserRole.AGENT,
        person: { firstName: "Test", lastName: "Agent" },
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "InvalidOrganizationEmailError",
    });
    expect(typeof res.json().message).toBe("string");
  });

  it("allows AGENT registration when the email domain is on the trusted allowlist", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: `agent-${suffix}@${trustedDomain}`,
        password: "test_password",
        role: UserRole.AGENT,
        person: { firstName: "Test", lastName: "Agent" },
      },
    });

    expect(res.statusCode).toBe(201);
    createdUserIds.push(res.json().id);
  });
});

// be#809: a person can hold more than one active AgentPerson membership (the
// unique index is on the (agentId, personId, role) triple, not personId
// alone) — /me previously only ever surfaced one via agentId.
describe("GET /user/me — agentMemberships (be#809)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let person: Person;
  let agentOne: Agent;
  let agentTwo: Agent;
  let user: User;
  let accessToken: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Multi", lastName: `Agent-${suffix}` }),
    );
    agentOne = await fastify.db.agentRepository.save(
      new Agent({ title: `RAC One ${suffix}` }),
    );
    agentTwo = await fastify.db.agentRepository.save(
      new Agent({ title: `RAC Two ${suffix}` }),
    );
    await fastify.db.agentPersonRepository.save([
      new AgentPerson({
        agentId: agentOne.id,
        personId: person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
      new AgentPerson({
        agentId: agentTwo.id,
        personId: person.id,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    ]);
    user = await fastify.db.userRepository.save(
      new User({
        email: `multi-agent-${suffix}@test.need4deed.org`,
        password: await hashPassword("test_password"),
        role: UserRole.AGENT,
        isActive: true,
        personId: person.id,
      }),
    );
    accessToken = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "access",
    });
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ id: user.id });
    await fastify.db.agentPersonRepository.delete({ personId: person.id });
    await fastify.db.agentRepository.delete({ id: agentOne.id });
    await fastify.db.agentRepository.delete({ id: agentTwo.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.close();
  });

  it("returns every active agent membership, not just one", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/user/me",
      cookies: { access: accessToken },
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();

    // The single "primary" field stays populated for existing consumers.
    expect(typeof data.agentId).toBe("number");

    expect(data.agentMemberships).toEqual(
      expect.arrayContaining([
        { agentId: agentOne.id, agentTitle: agentOne.title },
        { agentId: agentTwo.id, agentTitle: agentTwo.title },
      ]),
    );
    expect(data.agentMemberships).toHaveLength(2);
  });
});
