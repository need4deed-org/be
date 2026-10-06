import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

// be#975: POST/PATCH /agent/:id/contact echoed the contact Person unmasked.
// Since be#1048, POST links an existing AGENT user by email (as a PENDING
// membership), so a member of one NGO could probe another NGO user's contact
// details by email — and then overwrite them via PATCH.
describe("/agent/:id/contact PII", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const victimEmail = `victim-${suffix}@test.need4deed.org`;
  const memberEmail = `member-${suffix}@test.need4deed.org`;
  const coordinatorEmail = `coordinator-${suffix}@test.need4deed.org`;
  let memberCookie: string;
  let coordinatorCookie: string;
  let agentId: number;
  let victimPerson: Person;
  const createdPersonIds: number[] = [];
  const createdAgentIds: number[] = [];

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return res.cookies.find((c) => c.name === accessCookieName)!.value;
  }

  async function makeAgentUser(email: string, person: Person): Promise<void> {
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.AGENT,
        isActive: true,
        personId: person.id,
      }),
    );
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    await fastify.db.userRepository.save(
      new User({
        email: coordinatorEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
    );
    coordinatorCookie = await login(coordinatorEmail);

    const agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Contact PII Agent ${suffix}` }),
    );
    agentId = agent.id;
    createdAgentIds.push(agent.id);

    const memberPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Member", lastName: `Agent-${suffix}` }),
    );
    createdPersonIds.push(memberPerson.id);
    await makeAgentUser(memberEmail, memberPerson);
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId,
        personId: memberPerson.id,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
    memberCookie = await login(memberEmail);

    // An AGENT user of some other NGO.
    const otherAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Other NGO ${suffix}` }),
    );
    createdAgentIds.push(otherAgent.id);
    victimPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Victim",
        lastName: `Other-${suffix}`,
        phone: "+4915100000000",
      }),
    );
    createdPersonIds.push(victimPerson.id);
    await makeAgentUser(victimEmail, victimPerson);
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: otherAgent.id,
        personId: victimPerson.id,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    for (const id of createdAgentIds) {
      await fastify.db.agentRepository.delete({ id });
    }
    for (const personId of createdPersonIds) {
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.db.userRepository.delete({ email: coordinatorEmail });
    await fastify.close();
  });

  it("POST masks an existing AGENT user linked by email, and PATCH can't edit them", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: `/agent/${agentId}/contact`,
      cookies: { [accessCookieName]: memberCookie },
      payload: {
        firstName: "Anything",
        lastName: "Anything",
        email: victimEmail,
        role: AgentRoleType.SOCIAL_WORKER,
      },
    });
    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    expect(data.status).toBe(AgentMembershipStatus.PENDING);
    expect(data.person.id).toBe(victimPerson.id);
    expect(data.person.firstName).not.toBe("Victim");
    expect(data.person.lastName).not.toBe(victimPerson.lastName);
    expect(data.person.phone).not.toBe(victimPerson.phone);

    const patchAsMember = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agentId}/contact/${data.id}`,
      cookies: { [accessCookieName]: memberCookie },
      payload: { firstName: "Hijacked" },
    });
    expect(patchAsMember.statusCode).toBe(403);
    const reloaded = await fastify.db.personRepository.findOneByOrFail({
      id: victimPerson.id,
    });
    expect(reloaded.firstName).toBe("Victim");

    // A coordinator still sees and edits it unmasked.
    const patchAsCoordinator = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agentId}/contact/${data.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {},
    });
    expect(patchAsCoordinator.statusCode).toBe(200);
    expect(patchAsCoordinator.json().data.person.phone).toBe(
      victimPerson.phone,
    );

    await fastify.db.agentPersonRepository.delete({ id: data.id });
  });

  it("POST/PATCH still echo a contact the member just created unmasked", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: `/agent/${agentId}/contact`,
      cookies: { [accessCookieName]: memberCookie },
      payload: {
        firstName: "New",
        lastName: `Contact-${suffix}`,
        phone: "+4915111111111",
        role: AgentRoleType.SOCIAL_WORKER,
      },
    });
    expect(res.statusCode).toBe(201);
    const { data } = res.json();
    createdPersonIds.push(data.person.id);
    expect(data.status).toBe(AgentMembershipStatus.ACTIVE);
    expect(data.person.firstName).toBe("New");
    expect(data.person.phone).toBe("+4915111111111");

    const patch = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agentId}/contact/${data.id}`,
      cookies: { [accessCookieName]: memberCookie },
      payload: { firstName: "Renamed" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().data.person.firstName).toBe("Renamed");
    expect(patch.json().data.person.phone).toBe("+4915111111111");
  });
});
