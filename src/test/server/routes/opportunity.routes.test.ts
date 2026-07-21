import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
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

describe("PATCH /opportunity/:id agent status update", () => {
  let fastify: FastifyInstance;

  let ownAgent: Agent;
  let otherAgent: Agent;
  let ownOpportunity: Opportunity;
  let otherAgentOpportunity: Opportunity;
  let ownDeal: Deal;
  let otherDeal: Deal;
  let agentPerson: Person;
  let coordinatorPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    ownAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (own) ${suffix}` }),
    );
    otherAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (other) ${suffix}` }),
    );

    ownDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    otherDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );

    ownOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (own) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: ownAgent.id,
        dealId: ownDeal.id,
      }),
    );
    otherAgentOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (other) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: otherAgent.id,
        dealId: otherDeal.id,
      }),
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `agent-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
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

    agentCookie = await login(`agent-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(`coordinator-${suffix}@test.need4deed.org`);
  });

  afterAll(async () => {
    await fastify.db.opportunityRepository.delete({ id: ownOpportunity.id });
    await fastify.db.opportunityRepository.delete({
      id: otherAgentOpportunity.id,
    });
    await fastify.db.agentPersonRepository.delete({
      agentId: ownAgent.id,
      personId: agentPerson.id,
    });
    await fastify.db.dealRepository.delete({ id: ownDeal.id });
    await fastify.db.dealRepository.delete({ id: otherDeal.id });
    await fastify.db.agentRepository.delete({ id: ownAgent.id });
    await fastify.db.agentRepository.delete({ id: otherAgent.id });
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.close();
  });

  it("lets an agent set the status of their own agent's opportunity", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { statusOpportunity: OpportunityStatusType.INACTIVE },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.status).toBe(OpportunityStatusType.INACTIVE);
  });

  it("403s when an agent tries to update an opportunity of another agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${otherAgentOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { statusOpportunity: OpportunityStatusType.INACTIVE },
    });
    expect(res.statusCode).toBe(403);
  });

  it("403s when an agent tries to patch fields beyond status", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: {
        statusOpportunity: OpportunityStatusType.ACTIVE,
        title: "Sneaky rename",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("still lets a coordinator patch the full surface, including status", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        statusOpportunity: OpportunityStatusType.ACTIVE,
        title: "Coordinator renamed",
      },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.status).toBe(OpportunityStatusType.ACTIVE);
    expect(updated.title).toBe("Coordinator renamed");
  });
});
