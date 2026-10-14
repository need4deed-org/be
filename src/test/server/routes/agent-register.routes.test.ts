import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import TrustedDomain from "../../../data/entity/trusted-domain.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

describe("/agent/register", () => {
  let fastify: FastifyInstance;

  const password = "test_password";
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];
  const createdAgentIds: number[] = [];
  const createdAddressIds: number[] = [];

  async function makeRegistrant(domain: string): Promise<{
    person: Person;
    user: User;
    token: string;
  }> {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Registrant" }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `registrant-${suffix}@${domain}`,
        password: await hashPassword(password),
        role: UserRole.AGENT,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });
    return { person, user, token };
  }

  async function makeAgent(overrides: Partial<Agent> = {}): Promise<Agent> {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
        ...overrides,
      }),
    );
    createdAgentIds.push(agent.id);
    return agent;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    for (const personId of createdPersonIds) {
      await fastify.db.agentPersonRepository.delete({ personId });
    }
    for (const agentId of createdAgentIds) {
      await fastify.db.agentRepository.delete({ id: agentId });
    }
    for (const addressId of createdAddressIds) {
      await dataSource.getRepository(Address).delete({ id: addressId });
    }
    for (const userId of createdUserIds) {
      await fastify.db.userRepository.delete({ id: userId });
    }
    for (const personId of createdPersonIds) {
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.close();
  });

  it("reports no registration for a registrant without a coordinator membership", async () => {
    const { token, person } = await makeRegistrant("example.org");
    const initial = await fastify.inject({
      url: `/agent/register/status?token=${token}`,
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json().data).toEqual({ registered: false });
    const agent = await makeAgent();
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: person.id,
        role: AgentRoleType.OTHER,
      }),
    );
    const res = await fastify.inject({
      url: `/agent/register/status?token=${token}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ registered: false });
  });

  it.each([AgentMembershipStatus.ACTIVE, AgentMembershipStatus.PENDING])(
    "reports an existing %s coordinator membership and rejects repeated create/join submissions",
    async (status) => {
      const { token, person } = await makeRegistrant("example.org");
      const agent = await makeAgent();
      const membership = await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId: agent.id,
          personId: person.id,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status,
        }),
      );
      const res = await fastify.inject({
        url: `/agent/register/status?token=${token}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual({
        registered: true,
        agentId: agent.id,
        ...(status === AgentMembershipStatus.ACTIVE
          ? { agentTitle: agent.title }
          : {}),
        membershipStatus: status,
      });
      if (status === AgentMembershipStatus.PENDING) {
        expect(res.json().data).not.toHaveProperty("agentTitle");
        expect(res.body).not.toContain(agent.title);
      }

      const title = `Repeated NGO ${randomNumericSuffix()}`;
      for (const payload of [
        { agent: { title } },
        { agentId: agent.id },
        { agentId: 999999999 },
      ]) {
        const repeated = await fastify.inject({
          method: "POST",
          url: `/agent/register?token=${token}`,
          payload,
        });
        expect(repeated.statusCode).toBe(409);
        expect(repeated.json()).toMatchObject({
          conflict: "registered",
          agentId: agent.id,
          membershipStatus: status,
        });
      }
      expect(await fastify.db.agentRepository.findOneBy({ title })).toBeNull();
      const memberships = await fastify.db.agentPersonRepository.findBy({
        personId: person.id,
      });
      expect(memberships.map((row) => row.id)).toEqual([membership.id]);
      expect(memberships[0].status).toBe(status);
    },
  );

  it("rejects invalid, expired and wrong-type tokens on the status endpoint", async () => {
    const { user } = await makeRegistrant("example.org");
    const expiredPayload = {
      id: user.id,
      email: user.email,
      type: "verify" as const,
      exp: Math.floor(Date.now() / 1000) - 60,
    };
    const tokens = [
      "not-a-real-token",
      fastify.jwt.sign(expiredPayload),
      fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        type: "access",
      }),
    ];
    for (const token of tokens) {
      const res = await fastify.inject({
        url: `/agent/register/status?token=${token}`,
      });
      expect(res.statusCode).toBe(401);
    }
  });

  it("does not reveal another registrant's membership", async () => {
    const registered = await makeRegistrant("example.org");
    const other = await makeRegistrant("example.org");
    const agent = await makeAgent();
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: registered.person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
      }),
    );
    const res = await fastify.inject({
      url: `/agent/register/status?token=${other.token}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ registered: false });
  });

  it("rejects status lookups for unverified accounts and non-agent roles", async () => {
    const { token, user } = await makeRegistrant("example.org");
    await fastify.db.userRepository.update(user.id, { isActive: false });
    expect(
      (await fastify.inject({ url: `/agent/register/status?token=${token}` }))
        .statusCode,
    ).toBe(401);
    await fastify.db.userRepository.update(user.id, {
      isActive: true,
      role: UserRole.VOLUNTEER,
    });
    expect(
      (await fastify.inject({ url: `/agent/register/status?token=${token}` }))
        .statusCode,
    ).toBe(403);
  });

  it("401s with no token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/agent/register",
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("401s with an invalid token", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/agent/register?token=not-a-real-token",
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("401s a token whose type isn't 'verify' (e.g. an access token)", async () => {
    const { user } = await makeRegistrant("test.need4deed.org");
    const accessToken = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      type: "access",
    });

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${accessToken}`,
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("403s a verify token for a non-AGENT/ADMIN role", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `volunteer-${suffix}@test.need4deed.org`,
        password: await hashPassword(password),
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      type: "verify",
    });

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: 1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("creates a new agent for the registrant (CREATE branch)", async () => {
    const { token } = await makeRegistrant("test.need4deed.org");
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agent: { title: `Brand New NGO ${suffix}` } },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.membershipStatus).toBe(AgentMembershipStatus.ACTIVE);
    createdAgentIds.push(body.data.agentId);

    const membership = await fastify.db.agentPersonRepository.findOneBy({
      agentId: body.data.agentId,
    });
    expect(membership).not.toBeNull();
    expect(membership?.status).toBe(AgentMembershipStatus.ACTIVE);

    const status = await fastify.inject({
      url: `/agent/register/status?token=${token}`,
    });
    expect(status.statusCode).toBe(200);
    expect(status.json().data).toEqual({
      registered: true,
      agentId: body.data.agentId,
      agentTitle: `Brand New NGO ${suffix}`,
      membershipStatus: AgentMembershipStatus.ACTIVE,
    });
  });

  it("joins an existing agent as ACTIVE when the registrant's email domain matches an existing member", async () => {
    const domain = `matching-${Date.now()}.example.org`;
    const agent = await makeAgent();

    const existingMemberPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Existing",
        lastName: "Member",
        email: `existing@${domain}`,
      }),
    );
    createdPersonIds.push(existingMemberPerson.id);
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: existingMemberPerson.id,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const { token } = await makeRegistrant(domain);

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.agentId).toBe(agent.id);
    expect(body.data.membershipStatus).toBe(AgentMembershipStatus.ACTIVE);
  });

  it("joins an existing agent as PENDING when there's no domain match or trust", async () => {
    const agent = await makeAgent();
    const { token } = await makeRegistrant(
      `untrusted-${Date.now()}.example.org`,
    );

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.membershipStatus).toBe(AgentMembershipStatus.PENDING);
  });

  it("auto-approves ACTIVE when the registrant's domain is on the trusted allowlist", async () => {
    const domain = `trusted-${Date.now()}.example.org`;
    const trusted = await fastify.db.trustedDomainRepository.save(
      new TrustedDomain({ domain }),
    );

    try {
      const agent = await makeAgent();
      const { token } = await makeRegistrant(domain);

      const res = await fastify.inject({
        method: "POST",
        url: `/agent/register?token=${token}`,
        payload: { agentId: agent.id },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.membershipStatus).toBe(
        AgentMembershipStatus.ACTIVE,
      );
    } finally {
      await fastify.db.trustedDomainRepository.delete({ id: trusted.id });
    }
  });

  it("lists operators for a registrant with a verify token", async () => {
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "GET",
      url: `/agent/register/organizations?token=${token}`,
    });

    expect(res.statusCode).toBe(200);
    const organization = await fastify.db.organizationRepository.findOneOrFail({
      where: {},
    });
    expect(res.json().data).toContainEqual(
      expect.objectContaining({
        id: organization.id,
        title: organization.title,
      }),
    );
    expect(
      (
        await fastify.inject({
          method: "GET",
          url: "/agent/register/organizations?token=invalid",
        })
      ).statusCode,
    ).toBe(401);
  });

  it("stores the chosen operator (Träger) on the new agent", async () => {
    const organization = await fastify.db.organizationRepository.findOneOrFail({
      where: {},
    });
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: {
        agent: {
          title: `Operator NGO ${randomNumericSuffix()}`,
          organizationId: organization.id,
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const agentId = res.json().data.agentId;
    createdAgentIds.push(agentId);
    const agent = await fastify.db.agentRepository.findOneByOrFail({
      id: agentId,
    });
    expect(agent.organizationId).toBe(organization.id);
  });

  it("400s an unknown operator", async () => {
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: {
        agent: {
          title: `Operator NGO ${randomNumericSuffix()}`,
          organizationId: 999999999,
        },
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("409s creating an agent whose title is already taken", async () => {
    const existing = await makeAgent();
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agent: { title: existing.title } },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().conflict).toBe("title");
  });

  it("409s creating an agent at an existing agent's address unless confirmSharedAddress is set", async () => {
    const address = {
      addressStreet: `Gemeinsame Str ${randomNumericSuffix()}`,
      addressPostcode: "10115",
    };
    const register = async (agent: Record<string, unknown>) => {
      const { token } = await makeRegistrant("test.need4deed.org");
      return fastify.inject({
        method: "POST",
        url: `/agent/register?token=${token}`,
        payload: { agent },
      });
    };
    const track = async (agentId: number) => {
      createdAgentIds.push(agentId);
      const agent = await fastify.db.agentRepository.findOneByOrFail({
        id: agentId,
      });
      if (agent.addressId) {
        createdAddressIds.push(agent.addressId);
      }
    };

    const first = await register({
      title: `First NGO ${randomNumericSuffix()}`,
      ...address,
    });
    expect(first.statusCode).toBe(201);
    await track(first.json().data.agentId);

    const blocked = await register({
      title: `Second NGO ${randomNumericSuffix()}`,
      ...address,
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({
      conflict: "address",
      agentId: first.json().data.agentId,
    });

    const confirmed = await register({
      title: `Second NGO ${randomNumericSuffix()}`,
      ...address,
      confirmSharedAddress: true,
    });
    expect(confirmed.statusCode).toBe(201);
    await track(confirmed.json().data.agentId);
    expect(confirmed.json().data.agentId).not.toBe(first.json().data.agentId);
  });

  it("404s joining a nonexistent agent", async () => {
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: 999999999 },
    });

    expect(res.statusCode).toBe(404);
  });

  it("turns joining an unclaimed agent into a pending request", async () => {
    const agent = await makeAgent({ unclaimed: true });
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.membershipStatus).toBe(
      AgentMembershipStatus.PENDING,
    );
  });

  it("turns joining an INACTIVE agent into a pending request", async () => {
    const agent = await makeAgent({
      engagementStatus: AgentEngagementStatusType.INACTIVE,
    });
    const { token } = await makeRegistrant("test.need4deed.org");

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/register?token=${token}`,
      payload: { agentId: agent.id },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.membershipStatus).toBe(
      AgentMembershipStatus.PENDING,
    );
  });
});
