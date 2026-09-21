import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getPostcode, hashPassword } from "../../../data/utils";
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
  // be#1001: a free-email domain the existing-agent shortcut must not
  // auto-approve. Distinct from the seeded gmail.com volunteer addresses, to
  // isolate this test from unrelated dev-data collisions.
  const freeEmailDomain = "gmx.net";
  const createdUserIds: number[] = [];
  let freeDomainAgent: Agent;
  let freeDomainPerson: Person;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain: trustedDomain }),
    );

    // An existing agent member on the free-email domain — this is exactly
    // the shortcut be#1001 says must not apply to free domains.
    freeDomainPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Existing",
        lastName: `Agent-${suffix}`,
        email: `existing-agent-${suffix}@${freeEmailDomain}`,
      }),
    );
    freeDomainAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Free Domain RAC ${suffix}` }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: freeDomainAgent.id,
        personId: freeDomainPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    await fastify.db.trustedDomainRepository.delete({ domain: trustedDomain });
    await fastify.db.trustedDomainRepository.delete({
      domain: freeEmailDomain,
    });
    await fastify.db.agentPersonRepository.delete({
      personId: freeDomainPerson.id,
    });
    await fastify.db.agentRepository.delete({ id: freeDomainAgent.id });
    await fastify.db.personRepository.delete({ id: freeDomainPerson.id });
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

  it("be#1001: rejects a free-email-domain signup even though an existing agent already uses that domain", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: `agent-${suffix}@${freeEmailDomain}`,
        password: "test_password",
        role: UserRole.AGENT,
        person: { firstName: "Test", lastName: "Agent" },
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "InvalidOrganizationEmailError",
    });
  });

  it("be#1001: allows a free-email-domain signup once that domain is explicitly trusted", async () => {
    await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain: freeEmailDomain }),
    );

    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: `agent-trusted-${suffix}@${freeEmailDomain}`,
        password: "test_password",
        role: UserRole.AGENT,
        person: { firstName: "Test", lastName: "Agent" },
      },
    });

    expect(res.statusCode).toBe(201);
    createdUserIds.push(res.json().id);
  });
});

// be#923: POST /user previously always created a brand-new, disconnected
// Person when the body omitted person.id — even when a Person with that
// exact email already existed (e.g. from a legacy Volunteer row) — splitting
// one human across two unrelated records instead of linking them.
describe("POST /user — links existing Person by email instead of duplicating (be#923)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const createdPersonIds: number[] = [];
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  it("links to an existing Person by email (case-insensitive) instead of creating a duplicate", async () => {
    const email = `existing-person-${suffix}@example.com`;
    const existingPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Existing", lastName: "Volunteer" }),
    );
    existingPerson.email = email;
    await fastify.db.personRepository.save(existingPerson);
    createdPersonIds.push(existingPerson.id);

    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email: email.toUpperCase(),
        password: "test_password",
        role: UserRole.VOLUNTEER,
        person: { firstName: "Existing", lastName: "Volunteer" },
      },
    });

    expect(res.statusCode).toBe(201);
    createdUserIds.push(res.json().id);
    expect(res.json().person.id).toBe(existingPerson.id);

    const personCount = await fastify.db.personRepository.count({
      where: { email },
    });
    expect(personCount).toBe(1);
  });

  it("rejects (400, PersonAlreadyRegisteredError) when the matched Person already has a User of any role", async () => {
    const email = `already-registered-${suffix}@example.com`;
    const existingPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Already", lastName: "Registered", email }),
    );
    createdPersonIds.push(existingPerson.id);

    const existingUser = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword("test_password"),
        role: UserRole.VOLUNTEER,
        isActive: true,
        language: "en",
        timezone: "CET",
        personId: existingPerson.id,
      }),
    );
    createdUserIds.push(existingUser.id);

    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email,
        password: "another_password",
        role: UserRole.VOLUNTEER,
        person: { firstName: "Already", lastName: "Registered" },
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "PersonAlreadyRegisteredError" });
  });

  it("still creates a new Person for a genuinely new email (agent flow unaffected)", async () => {
    const email = `brand-new-${suffix}@example.com`;

    const res = await fastify.inject({
      method: "POST",
      url: "/user",
      payload: {
        email,
        password: "test_password",
        role: UserRole.VOLUNTEER,
        person: { firstName: "Brand", lastName: "New" },
      },
    });

    expect(res.statusCode).toBe(201);
    createdUserIds.push(res.json().id);
    createdPersonIds.push(res.json().person.id);
  });
});

// be#943: POST /user/verify-email now also reports whether a VOLUNTEER's
// linked Person already has a Volunteer profile, so fe#956 can skip the
// completion form and send an already-existing volunteer straight to login.
describe("POST /user/verify-email — hasVolunteerProfile (be#943)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const createdPersonIds: number[] = [];
  const createdUserIds: number[] = [];
  const createdDealIds: number[] = [];
  const createdVolunteerIds: number[] = [];

  async function makeInactiveUser(
    email: string,
    role: UserRole,
    personId?: number,
  ): Promise<User> {
    const user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword("test_password"),
        role,
        isActive: false,
        language: "en",
        timezone: "CET",
        personId,
      }),
    );
    createdUserIds.push(user.id);
    return user;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const id of createdVolunteerIds) {
      await fastify.db.volunteerRepository.delete({ id });
    }
    for (const id of createdDealIds) {
      await fastify.db.dealRepository.delete({ id });
    }
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  it("reports hasVolunteerProfile: false for a VOLUNTEER with no Volunteer row yet", async () => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "New", lastName: "Volunteer" }),
    );
    createdPersonIds.push(person.id);
    const user = await makeInactiveUser(
      `new-volunteer-${suffix}@example.com`,
      UserRole.VOLUNTEER,
      person.id,
    );
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });

    const res = await fastify.inject({
      method: "POST",
      url: "/user/verify-email",
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      verified: true,
      hasVolunteerProfile: false,
    });
  });

  it("reports hasVolunteerProfile: true for a VOLUNTEER whose Person already has one", async () => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Existing", lastName: "Volunteer" }),
    );
    createdPersonIds.push(person.id);
    const postcode = await getPostcode("10115");
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    createdDealIds.push(deal.id);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ personId: person.id, dealId: deal.id }),
    );
    createdVolunteerIds.push(volunteer.id);
    const user = await makeInactiveUser(
      `existing-volunteer-${suffix}@example.com`,
      UserRole.VOLUNTEER,
      person.id,
    );
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });

    const res = await fastify.inject({
      method: "POST",
      url: "/user/verify-email",
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      verified: true,
      hasVolunteerProfile: true,
    });
  });

  it("omits hasVolunteerProfile for non-VOLUNTEER roles", async () => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Some", lastName: "Agent" }),
    );
    createdPersonIds.push(person.id);
    const user = await makeInactiveUser(
      `agent-${suffix}@example.com`,
      UserRole.AGENT,
      person.id,
    );
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });

    const res = await fastify.inject({
      method: "POST",
      url: "/user/verify-email",
      payload: { token },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).not.toHaveProperty("hasVolunteerProfile");
  });

  it("throws AlreadyUsedTokenError for an already used token", async () => {
    const user = await makeInactiveUser(
      "user-already-used-token@example.com",
      UserRole.VOLUNTEER,
      undefined,
    );
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });

    // make user active, so the token is now "used"
    user.isActive = true;
    await fastify.db.userRepository.save(user);

    const res = await fastify.inject({
      method: "POST",
      url: "/user/verify-email",
      payload: { token },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({
      error: "AlreadyUsedTokenError",
      message: "Already used token.",
    });
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
    // agentTwo's SOCIAL_WORKER row is inserted first (lower id) and
    // agentOne's VOLUNTEER_COORDINATOR row second (higher id), so a
    // regression that picks by insertion/id order instead of role would
    // resolve agentId to agentTwo and fail the assertion below.
    await fastify.db.agentPersonRepository.save([
      new AgentPerson({
        agentId: agentTwo.id,
        personId: person.id,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
      new AgentPerson({
        agentId: agentOne.id,
        personId: person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
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
      role: user.role,
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

    // The single "primary" field prefers the VOLUNTEER_COORDINATOR
    // membership regardless of insertion/id order (see setup above).
    expect(data.agentId).toBe(agentOne.id);

    expect(data.agentMemberships).toEqual(
      expect.arrayContaining([
        { agentId: agentOne.id, agentTitle: agentOne.title },
        { agentId: agentTwo.id, agentTitle: agentTwo.title },
      ]),
    );
    expect(data.agentMemberships).toHaveLength(2);
  });
});

// be#809: a person can hold multiple roles at the *same* agent (that's what
// AgentPerson's (agentId, personId, role) unique index allows) — those must
// collapse to one agentMemberships entry, since ApiAgentMembershipSummary
// has no role field to distinguish them by.
describe("GET /user/me — agentMemberships dedupes same-agent roles (be#809)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  let person: Person;
  let agent: Agent;
  let user: User;
  let accessToken: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    person = await fastify.db.personRepository.save(
      new Person({ firstName: "DualRole", lastName: `Agent-${suffix}` }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `RAC Dual ${suffix}` }),
    );
    await fastify.db.agentPersonRepository.save([
      new AgentPerson({
        agentId: agent.id,
        personId: person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
      new AgentPerson({
        agentId: agent.id,
        personId: person.id,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    ]);
    user = await fastify.db.userRepository.save(
      new User({
        email: `dual-role-${suffix}@test.need4deed.org`,
        password: await hashPassword("test_password"),
        role: UserRole.AGENT,
        isActive: true,
        personId: person.id,
      }),
    );
    accessToken = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    });
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ id: user.id });
    await fastify.db.agentPersonRepository.delete({ personId: person.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.close();
  });

  it("returns one entry, not one per role", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/user/me",
      cookies: { access: accessToken },
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();

    expect(data.agentMemberships).toEqual([
      { agentId: agent.id, agentTitle: agent.title },
    ]);
  });
});

// be#948: /me previously resolved agentId for role: AGENT but had no
// equivalent for role: VOLUNTEER, leaving the frontend with no way to learn
// "which Volunteer row is mine".
describe("GET /user/me — volunteerId (be#948)", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  async function makeVolunteerUser(email: string, personId: number) {
    const user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword("test_password"),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId,
      }),
    );
    return {
      user,
      accessToken: fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        type: "access",
      }),
    };
  }

  it("resolves volunteerId for a VOLUNTEER with an existing Volunteer profile", async () => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Existing", lastName: `Volunteer-${suffix}` }),
    );
    const postcode = await getPostcode("10115");
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ personId: person.id, dealId: deal.id }),
    );
    const { user, accessToken } = await makeVolunteerUser(
      `existing-volunteer-me-${suffix}@example.com`,
      person.id,
    );

    try {
      const res = await fastify.inject({
        method: "GET",
        url: "/user/me",
        cookies: { access: accessToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.volunteerId).toBe(volunteer.id);
    } finally {
      await fastify.db.userRepository.delete({ id: user.id });
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
      await fastify.db.dealRepository.delete({ id: deal.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
  });

  it("omits volunteerId for a VOLUNTEER who hasn't completed profile registration yet", async () => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "New", lastName: `Volunteer-${suffix}` }),
    );
    const { user, accessToken } = await makeVolunteerUser(
      `new-volunteer-me-${suffix}@example.com`,
      person.id,
    );

    try {
      const res = await fastify.inject({
        method: "GET",
        url: "/user/me",
        cookies: { access: accessToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).not.toHaveProperty("volunteerId");
    } finally {
      await fastify.db.userRepository.delete({ id: user.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
  });
});

// be#1008: admin-generated invite-link flow for coordinator account
// creation, so the admin never sets/sees the coordinator's password
// themselves (be#1002 epic).
describe("POST /user/admin/coordinator-invite", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];
  let adminAccessToken: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const adminPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Admin", lastName: `User-${suffix}` }),
    );
    createdPersonIds.push(adminPerson.id);
    const admin = await fastify.db.userRepository.save(
      new User({
        email: `admin-${suffix}@test.need4deed.org`,
        password: await hashPassword("test_password"),
        role: UserRole.ADMIN,
        isActive: true,
        personId: adminPerson.id,
      }),
    );
    createdUserIds.push(admin.id);
    adminAccessToken = fastify.jwt.sign({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "access",
    });
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  it("401s an unauthenticated request", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user/admin/coordinator-invite",
      payload: {
        email: `invitee-${suffix}@example.com`,
        person: { firstName: "New", lastName: "Coordinator" },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403s a non-admin session", async () => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Regular", lastName: `Volunteer-${suffix}` }),
    );
    createdPersonIds.push(person.id);
    const volunteer = await fastify.db.userRepository.save(
      new User({
        email: `volunteer-${suffix}@example.com`,
        password: await hashPassword("test_password"),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(volunteer.id);
    const accessToken = fastify.jwt.sign({
      id: volunteer.id,
      email: volunteer.email,
      role: volunteer.role,
      type: "access",
    });

    const res = await fastify.inject({
      method: "POST",
      url: "/user/admin/coordinator-invite",
      cookies: { access: accessToken },
      payload: {
        email: `invitee-${suffix}@example.com`,
        person: { firstName: "New", lastName: "Coordinator" },
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns a signed invite link for an admin caller", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user/admin/coordinator-invite",
      cookies: { access: adminAccessToken },
      payload: {
        email: `invitee-${suffix}@example.com`,
        person: { firstName: "New", lastName: "Coordinator" },
      },
    });

    expect(res.statusCode).toBe(201);
    const { token, link, expiresAt } = res.json();
    expect(typeof token).toBe("string");
    expect(link).toContain(token);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    const payload = fastify.jwt.decode(token) as {
      email: string;
      type: string;
      person: { firstName: string; lastName: string };
    };
    expect(payload.type).toBe("coordinator-invite");
    expect(payload.email).toBe(`invitee-${suffix}@example.com`);
    expect(payload.person).toMatchObject({
      firstName: "New",
      lastName: "Coordinator",
    });
  });

  it("409s when a User with that email already exists", async () => {
    const email = `existing-${suffix}@example.com`;
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Existing", lastName: "User" }),
    );
    createdPersonIds.push(person.id);
    const existingUser = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword("test_password"),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(existingUser.id);

    const res = await fastify.inject({
      method: "POST",
      url: "/user/admin/coordinator-invite",
      cookies: { access: adminAccessToken },
      payload: {
        email,
        person: { firstName: "New", lastName: "Coordinator" },
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

// be#1008: the public side of the invite flow — the invitee sets their own
// password to activate a COORDINATOR account.
describe("POST /user/register-with-invite", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];

  function makeInviteToken(
    email: string,
    person = { firstName: "New", lastName: "Coordinator" },
  ): string {
    return fastify.jwt.sign(
      { email, person, type: "coordinator-invite" },
      { expiresIn: "7d" },
    );
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await fastify.db.userRepository.delete({ id });
    }
    for (const id of createdPersonIds) {
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.close();
  });

  it("400s with no token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user/register-with-invite",
      payload: { password: "chosen_password" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("401s an invalid token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/user/register-with-invite?token=not-a-real-token",
      payload: { password: "chosen_password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("401s a wrong-type token (e.g. an email-verification token)", async () => {
    const token = fastify.jwt.sign({
      id: 1,
      email: `wrong-type-${suffix}@example.com`,
      type: "verify",
    });

    const res = await fastify.inject({
      method: "POST",
      url: `/user/register-with-invite?token=${token}`,
      payload: { password: "chosen_password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("creates an active COORDINATOR account from a valid invite token", async () => {
    const email = `invitee-${suffix}@example.com`;
    const token = makeInviteToken(email);

    const res = await fastify.inject({
      method: "POST",
      url: `/user/register-with-invite?token=${token}`,
      payload: { password: "chosen_password" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    createdUserIds.push(body.id);
    createdPersonIds.push(body.person.id);
    expect(body.email).toBe(email);
    expect(body.role).toBe(UserRole.COORDINATOR);
    expect(body.isActive).toBe(true);
    expect(body.person).toMatchObject({
      firstName: "New",
      lastName: "Coordinator",
    });
  });

  it("links to an existing Person by email instead of creating a duplicate (be#1008 review)", async () => {
    const email = `existing-person-invite-${suffix}@example.com`;
    const existingPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Legacy", lastName: "Volunteer" }),
    );
    existingPerson.email = email;
    await fastify.db.personRepository.save(existingPerson);
    createdPersonIds.push(existingPerson.id);

    const token = makeInviteToken(email);
    const res = await fastify.inject({
      method: "POST",
      url: `/user/register-with-invite?token=${token}`,
      payload: { password: "chosen_password" },
    });

    expect(res.statusCode).toBe(201);
    createdUserIds.push(res.json().id);
    expect(res.json().person.id).toBe(existingPerson.id);

    const personCount = await fastify.db.personRepository.count({
      where: { email },
    });
    expect(personCount).toBe(1);
  });

  it("409s (PersonAlreadyRegisteredError-style rejection) when the matched Person already has a User", async () => {
    const email = `already-registered-invite-${suffix}@example.com`;
    const existingPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Already", lastName: "Registered", email }),
    );
    createdPersonIds.push(existingPerson.id);
    const existingUser = await fastify.db.userRepository.save(
      new User({
        email: `distinct-login-${suffix}@example.com`,
        password: await hashPassword("test_password"),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: existingPerson.id,
      }),
    );
    createdUserIds.push(existingUser.id);

    const token = makeInviteToken(email);
    const res = await fastify.inject({
      method: "POST",
      url: `/user/register-with-invite?token=${token}`,
      payload: { password: "chosen_password" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "PersonAlreadyRegisteredError" });
  });

  it("rejects a replay of an already-consumed invite token (single-use)", async () => {
    const email = `replay-${suffix}@example.com`;
    const token = makeInviteToken(email);

    const first = await fastify.inject({
      method: "POST",
      url: `/user/register-with-invite?token=${token}`,
      payload: { password: "chosen_password" },
    });
    expect(first.statusCode).toBe(201);
    createdUserIds.push(first.json().id);
    createdPersonIds.push(first.json().person.id);

    const second = await fastify.inject({
      method: "POST",
      url: `/user/register-with-invite?token=${token}`,
      payload: { password: "another_password" },
    });
    // The Person-already-registered check runs before the User-email
    // guard (be#1011 review, matching POST /'s ordering), so a replay
    // surfaces as the same 400/PersonAlreadyRegisteredError as any other
    // "this identity is already registered" case, not a 409.
    expect(second.statusCode).toBe(400);
    expect(second.json()).toMatchObject({
      error: "PersonAlreadyRegisteredError",
    });
  });
});
