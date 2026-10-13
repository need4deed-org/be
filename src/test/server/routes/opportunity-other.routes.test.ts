import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
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
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "member" | "volunteer";
type OpportunityKey = "own" | "otherOpen" | "otherPast";

describe("GET /opportunity/other (fe#1052)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `OtherOpp ${suffix}`;

  let ownAgent: Agent;
  let otherAgent: Agent;
  const deals: Deal[] = [];
  const opportunities = {} as Record<OpportunityKey, Opportunity>;
  const persons: Person[] = [];
  const cookies = {} as Record<Caller, string>;

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    [ownAgent, otherAgent] = await Promise.all(
      ["own", "other"].map((key) =>
        fastify.db.agentRepository.save(
          new Agent({
            title: `${prefix} agent ${key}`,
            engagementStatus: AgentEngagementStatusType.ACTIVE,
          }),
        ),
      ),
    );

    const setup: Record<
      OpportunityKey,
      { agent: Agent; status: OpportunityStatusType }
    > = {
      own: { agent: ownAgent, status: OpportunityStatusType.NEW },
      otherOpen: { agent: otherAgent, status: OpportunityStatusType.SEARCHING },
      otherPast: { agent: otherAgent, status: OpportunityStatusType.PAST },
    };
    for (const [key, { agent, status }] of Object.entries(setup) as [
      OpportunityKey,
      { agent: Agent; status: OpportunityStatusType },
    ][]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `${prefix} ${key}`,
          type: OpportunityType.REGULAR,
          status,
          dealId: deal.id,
          agentId: agent.id,
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      member: UserRole.AGENT,
      volunteer: UserRole.VOLUNTEER,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Other", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `other-opp-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller === "member") {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: ownAgent.id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }
  });

  afterAll(async () => {
    for (const opportunity of Object.values(opportunities)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    await fastify.db.agentPersonRepository.delete({ agentId: ownAgent.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    for (const agent of [ownAgent, otherAgent]) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify.close();
  });

  it("lists other NGOs' open opportunities, title and location only", async () => {
    const res = await get(
      `/opportunity/other?search=${encodeURIComponent(prefix)}`,
      "member",
    );
    expect(res.statusCode).toBe(200);
    const { data, count } = res.json();
    expect(count).toBe(1);
    expect(data).toHaveLength(1);
    expect(Object.keys(data[0]).sort()).toEqual(
      ["createdAt", "district", "id", "title"].sort(),
    );
    expect(data[0].id).toBe(opportunities.otherOpen.id);
  });

  it("is only for NGO users", async () => {
    expect((await get("/opportunity/other", "volunteer")).statusCode).toBe(403);
  });

  it("still 404s another NGO's opportunity detail", async () => {
    const res = await get(
      `/opportunity/${opportunities.otherOpen.id}`,
      "member",
    );
    expect(res.statusCode).toBe(404);
  });
});
