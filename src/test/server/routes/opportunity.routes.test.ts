import { FastifyInstance } from "fastify";
import {
  EntityTableName,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
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

  // An agent including `agent.id` alongside statusOpportunity would otherwise
  // silently reach the relink branch — this confirms the existing
  // disallowedKeys check (which only permits `statusOpportunity`) already
  // blocks a non-coordinator from moving an opportunity to another agent.
  it("403s when an agent tries to relink an opportunity to another agent via agent.id", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: {
        statusOpportunity: OpportunityStatusType.ACTIVE,
        agent: { id: otherAgent.id },
      },
    });
    expect(res.statusCode).toBe(403);

    const unchanged = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(unchanged.agentId).toBe(ownAgent.id);
  });

  it("lets a coordinator relink an opportunity to another agent via agent.id", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { agent: { id: otherAgent.id } },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.agentId).toBe(otherAgent.id);

    // Restore for any later test in this file that assumes ownAgent.
    await fastify.db.opportunityRepository.update(
      { id: ownOpportunity.id },
      { agentId: ownAgent.id },
    );
  });
});

describe("DELETE /opportunity/:id", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let volunteer: Volunteer;
  let opportunity: Opportunity;
  let deal: Deal;
  let accompanying: Accompanying;
  let opportunityVolunteer: OpportunityVolunteer;
  let comment: Comment;
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

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (delete) ${suffix}` }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    accompanying = await fastify.db.accompanyingRepository.save(
      new Accompanying({
        address: "Test Address",
        name: "Test Refugee",
        date: new Date(),
      }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (delete) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
        accompanyingId: accompanying.id,
      }),
    );

    const volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: volunteerDeal.id, personId: volunteerPerson.id }),
    );
    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );

    const language = await fastify.db.languageRepository.findOneOrFail({
      where: {},
    });
    comment = await fastify.db.commentRepository.save(
      new Comment({
        text: "Test comment",
        entityType: EntityTableName.OPPORTUNITY,
        entityId: opportunity.id,
        languageId: language.id,
        userId: 0, // overwritten below once the coordinator user exists
      }),
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-del-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.commentRepository.update(
      { id: comment.id },
      { userId: coordinatorUser.id },
    );
    await fastify.db.userRepository.save(
      new User({
        email: `agent-del-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({ agentId: agent.id, personId: agentPerson.id }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };

    agentCookie = await login(`agent-del-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-del-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({
      agentId: agent.id,
      personId: agentPerson.id,
    });
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    // opportunity/deal/accompanying/comment/opportunityVolunteer/volunteer are
    // deleted by the DELETE /opportunity/:id call itself in the tests below;
    // these are best-effort in case a test fails before reaching that point.
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.commentRepository.delete({ id: comment.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.accompanyingRepository.delete({ id: accompanying.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.close();
  });

  it("403s when a non-coordinator tries to delete an opportunity", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404s for a nonexistent opportunity", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity/999999999`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lets a coordinator delete an opportunity, cascading its deal, accompanying, comments, and match link", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    expect(
      await fastify.db.opportunityRepository.findOneBy({ id: opportunity.id }),
    ).toBeNull();
    expect(
      await fastify.db.dealRepository.findOneBy({ id: deal.id }),
    ).toBeNull();
    expect(
      await fastify.db.accompanyingRepository.findOneBy({
        id: accompanying.id,
      }),
    ).toBeNull();
    expect(
      await fastify.db.commentRepository.findOneBy({ id: comment.id }),
    ).toBeNull();
    expect(
      await fastify.db.opportunityVolunteerRepository.findOneBy({
        id: opportunityVolunteer.id,
      }),
    ).toBeNull();

    // The linked volunteer itself is untouched by an opportunity delete.
    expect(
      await fastify.db.volunteerRepository.findOneBy({ id: volunteer.id }),
    ).not.toBeNull();
  });
});
