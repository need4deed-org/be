import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityEventRegistration from "../../../data/entity/opportunity-event-registration.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string {
  const cookie = cookies.find((c) => c.name === name)?.value;
  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return cookie;
}

describe("GET /opportunity/:id/registrations", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let ownAgent: Agent;
  let otherAgent: Agent;
  let ownOpportunity: Opportunity;
  let agentPerson: Person;
  let coordinatorPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;
  let volunteerCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    ownAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (own) ${suffix}` }),
    );
    otherAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (other) ${suffix}` }),
    );

    ownOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test event-registration-get opportunity ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.ACTIVE,
        agentId: ownAgent.id,
      } as Partial<Opportunity>),
    );

    // Saved sequentially (not batched) so each row gets a distinct createdAt
    // — a batched multi-row INSERT shares one now() value, making the
    // createdAt DESC ordering assertions below non-deterministic.
    await getRepository(dataSource, OpportunityEventRegistration).save(
      new OpportunityEventRegistration({
        opportunityId: ownOpportunity.id,
        fullName: "Ali K.",
        email: "ali@example.com",
        numberOfPeople: 2,
      }),
    );
    await getRepository(dataSource, OpportunityEventRegistration).save(
      new OpportunityEventRegistration({
        opportunityId: ownOpportunity.id,
        fullName: "Bilal T.",
        email: "bilal@example.com",
        numberOfPeople: 3,
      }),
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `agent-getreg-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-getreg-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `volunteer-getreg-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerPerson.id,
      }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({ agentId: ownAgent.id, personId: agentPerson.id }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };

    agentCookie = await login(`agent-getreg-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-getreg-${suffix}@test.need4deed.org`,
    );
    volunteerCookie = await login(
      `volunteer-getreg-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await getRepository(dataSource, OpportunityEventRegistration).delete({
      opportunityId: ownOpportunity.id,
    });
    await fastify.db.opportunityRepository.delete({ id: ownOpportunity.id });
    await fastify.db.agentPersonRepository.delete({
      agentId: ownAgent.id,
      personId: agentPerson.id,
    });
    await fastify.db.agentRepository.delete({ id: ownAgent.id });
    await fastify.db.agentRepository.delete({ id: otherAgent.id });
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.close();
  });

  it("lets a coordinator list registrations with count and totalPeople", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${ownOpportunity.id}/registrations`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(2);
    expect(body.totalPeople).toBe(5);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].fullName).toBe("Bilal T.");
  });

  it("lets an agent list registrations for their own agent's opportunity", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${ownOpportunity.id}/registrations`,
      cookies: { [accessCookieName]: agentCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().count).toBe(2);
  });

  it("403s a volunteer/user role outright", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${ownOpportunity.id}/registrations`,
      cookies: { [accessCookieName]: volunteerCookie },
    });

    expect(res.statusCode).toBe(403);
  });

  it("403s an agent from another agent's opportunity", async () => {
    const otherOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test other-agent opportunity ${suffix}`,
        type: OpportunityType.EVENTS,
        agentId: otherAgent.id,
      } as Partial<Opportunity>),
    );

    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${otherOpportunity.id}/registrations`,
      cookies: { [accessCookieName]: agentCookie },
    });

    expect(res.statusCode).toBe(403);

    await fastify.db.opportunityRepository.delete({ id: otherOpportunity.id });
  });

  it("404s for a nonexistent opportunity", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity/999999999/registrations",
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(404);
  });

  it("exports a CSV with the expected headers and columns", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${ownOpportunity.id}/registrations/export`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toBe(
      `attachment; filename="registrations-${ownOpportunity.id}.csv"`,
    );

    const lines = res.body.trim().split("\n");
    expect(lines[0]).toBe(
      "Name,Email,Phone,People,Language,Message,Registered at",
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Bilal T.");
  });
});
