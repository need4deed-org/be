import { FastifyInstance } from "fastify";
import {
  AgentRoleType,
  AgentVolunteerSearchType,
  EntityTableName,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
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
  let agentContactPerson: Person;
  let unrelatedPerson: Person;
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
    agentContactPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "AgentContact" }),
    );
    unrelatedPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Unrelated" }),
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
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: ownAgent.id,
        personId: agentContactPerson.id,
        role: AgentRoleType.OTHER,
      }),
    );
    // Registered as a contact of otherAgent, not ownAgent — used to confirm
    // the membership check rejects a contact that belongs to a different
    // agent, not just a person with no agent contact at all.
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: otherAgent.id,
        personId: unrelatedPerson.id,
        role: AgentRoleType.OTHER,
      }),
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
    await fastify.db.agentPersonRepository.delete({
      agentId: ownAgent.id,
      personId: agentContactPerson.id,
    });
    await fastify.db.agentPersonRepository.delete({
      agentId: otherAgent.id,
      personId: unrelatedPerson.id,
    });
    await fastify.db.dealRepository.delete({ id: ownDeal.id });
    await fastify.db.dealRepository.delete({ id: otherDeal.id });
    await fastify.db.agentRepository.delete({ id: ownAgent.id });
    await fastify.db.agentRepository.delete({ id: otherAgent.id });
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentContactPerson.id });
    await fastify.db.personRepository.delete({ id: unrelatedPerson.id });
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

  it("403s when an agent tries to relink an opportunity's contact via contact.id", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: {
        statusOpportunity: OpportunityStatusType.ACTIVE,
        contact: { id: agentContactPerson.id },
      },
    });
    expect(res.statusCode).toBe(403);

    const unchanged = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(unchanged.contactPersonId).toBeFalsy();
  });

  it("lets a coordinator relink an opportunity's contact to a registered contact of its agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { contact: { id: agentContactPerson.id } },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.contactPersonId).toBe(agentContactPerson.id);
  });

  it("clears the opportunity's contact when relinking agent.id without also sending contact.id", async () => {
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
    expect(updated.contactPersonId).toBeFalsy();

    // Restore for the following tests, which assume ownOpportunity is on
    // ownAgent again.
    await fastify.db.opportunityRepository.update(
      { id: ownOpportunity.id },
      { agentId: ownAgent.id },
    );
  });

  it("404s when relinking an opportunity's contact to a person who is a registered contact of a different agent", async () => {
    const before = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });

    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { contact: { id: unrelatedPerson.id } },
    });
    expect(res.statusCode).toBe(404);

    const unchanged = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(unchanged.contactPersonId).toBe(before.contactPersonId);
  });

  // unrelatedPerson is only a registered contact of otherAgent (confirmed
  // rejected against ownAgent by the previous test) — relinking agent.id and
  // contact.id together in one request must validate the contact against
  // the *new* agent, not the opportunity's current one.
  it("lets a coordinator relink both agent and contact in one request, validating the contact against the new agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        agent: { id: otherAgent.id },
        contact: { id: unrelatedPerson.id },
      },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.agentId).toBe(otherAgent.id);
    expect(updated.contactPersonId).toBe(unrelatedPerson.id);

    // Restore for any later test in this file that assumes ownAgent.
    await fastify.db.opportunityRepository.update(
      { id: ownOpportunity.id },
      { agentId: ownAgent.id, contactPersonId: agentContactPerson.id },
    );
  });
});

// Regression test for be#862: this cascade used to be a second, independent
// PATCH /agent/:id fired by the frontend after the opportunity PATCH
// succeeded — non-atomic, and easy to forget for other callers. It now
// happens server-side, in the same transaction as the opportunity patch.
describe("PATCH /opportunity/:id cascades Agent.volunteerSearch (be#862)", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let opportunity: Opportunity;
  let deal: Deal;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (search-cascade) ${suffix}` }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (search-cascade) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.INACTIVE,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-search-cascade-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-search-cascade-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.close();
  });

  it("leaves the agent's volunteerSearch untouched when the opportunity moves to a non-searching status", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { statusOpportunity: OpportunityStatusType.PAST },
    });
    expect(res.statusCode).toBe(204);

    const updatedAgent = await fastify.db.agentRepository.findOneByOrFail({
      id: agent.id,
    });
    expect(updatedAgent.searchStatus).toBe(AgentVolunteerSearchType.NOT_NEEDED);
  });

  it("flips the agent's volunteerSearch to SEARCHING when the opportunity's status becomes ACTIVE", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { statusOpportunity: OpportunityStatusType.ACTIVE },
    });
    expect(res.statusCode).toBe(204);

    const updatedAgent = await fastify.db.agentRepository.findOneByOrFail({
      id: agent.id,
    });
    expect(updatedAgent.searchStatus).toBe(AgentVolunteerSearchType.SEARCHING);
  });
});

describe("DELETE /opportunity/:id", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let volunteer: Volunteer;
  let opportunity: Opportunity;
  let deal: Deal;
  let accompanying: Accompanying;
  let onetimer: Onetimer;
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
      }),
    );
    onetimer = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: new Date() }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (delete) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
        accompanyingId: accompanying.id,
        onetimerId: onetimer.id,
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
    // Set deterministically rather than relying on OpportunityVolunteer's
    // fire-and-forget @AfterInsert hook (updateVolunteerMatching isn't
    // awaited there), so the "before" state for the recompute assertion
    // below isn't a race.
    await fastify.db.volunteerRepository.update(
      { id: volunteer.id },
      { statusMatch: VolunteerStateMatchType.MATCHED },
    );

    const language = await fastify.db.languageRepository.findOneOrFail({
      where: {},
    });

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
    comment = await fastify.db.commentRepository.save(
      new Comment({
        text: "Test comment",
        entityType: EntityTableName.OPPORTUNITY,
        entityId: opportunity.id,
        languageId: language.id,
        userId: coordinatorUser.id,
      }),
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
    await fastify.db.onetimerRepository.delete({ id: onetimer.id });
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

  it("lets a coordinator delete an opportunity, cascading its deal, accompanying, onetimer, comments, and match link", async () => {
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
      await fastify.db.onetimerRepository.findOneBy({ id: onetimer.id }),
    ).toBeNull();
    expect(
      await fastify.db.commentRepository.findOneBy({ id: comment.id }),
    ).toBeNull();
    expect(
      await fastify.db.opportunityVolunteerRepository.findOneBy({
        id: opportunityVolunteer.id,
      }),
    ).toBeNull();

    // The linked volunteer itself is untouched by an opportunity delete, but
    // its match status is recomputed now that the match link is gone —
    // confirming the deleted OpportunityVolunteer's cascade (which bypasses
    // its own @AfterRemove hook) doesn't leave the volunteer stuck at MATCHED.
    const survivingVolunteer = await fastify.db.volunteerRepository.findOneBy({
      id: volunteer.id,
    });
    expect(survivingVolunteer).not.toBeNull();
    expect(survivingVolunteer?.statusMatch).toBe(
      VolunteerStateMatchType.NEEDS_REMATCH,
    );
  });
});

// Regression test for be#816: the onetimer-writing logic in the PATCH
// handler used to be two independent blocks, each reading the pre-request
// `opportunity.onetimerId`. A payload carrying both `accompanyingDetails`
// and `event` in the same request (the JSON schema doesn't forbid it) made
// the second block miss the onetimer the first had just created and linked,
// creating a second, orphaned `Onetimer` row. The fix resolves a single date
// tied to the *resulting* type before writing onetimer at all.
describe("PATCH /opportunity/:id onetimer resolution", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let deal: Deal;
  let opportunity: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (onetimer-resolve) ${suffix}` }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (onetimer-resolve) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-onetimer-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: coordinatorUser.email,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    const updated = await fastify.db.opportunityRepository.findOneBy({
      id: opportunity.id,
    });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    if (updated?.onetimerId) {
      await fastify.db.onetimerRepository.delete({ id: updated.onetimerId });
    }
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("writes exactly one onetimer using the event date when both accompanyingDetails and event are sent", async () => {
    // Distinct, test-specific dates so we can positively assert neither an
    // orphaned row (from the accompanyingDetails date) nor a stray one from
    // other concurrently-running tests interferes with the check.
    const eventDate = "2026-08-01";
    const accompanyingDate = "2026-09-11";

    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunity_type: "events",
        event: { date: eventDate, time: "14:00" },
        accompanyingDetails: {
          appointmentDate: accompanyingDate,
          appointmentTime: "09:00",
        },
      },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: opportunity.id,
    });
    expect(updated.onetimerId).toBeTruthy();

    const onetimer = await fastify.db.onetimerRepository.findOneByOrFail({
      id: updated.onetimerId,
    });
    // The event date wins (matches the resulting EVENTS type), not the
    // accompanyingDetails date.
    expect(new Date(onetimer.date).toISOString().slice(0, 10)).toBe(eventDate);

    // No orphaned second row was created from the accompanyingDetails date —
    // if the two write paths still raced, this row would exist and be
    // unreferenced by any opportunity.
    const orphan = await fastify.db.onetimerRepository
      .createQueryBuilder("onetimer")
      .where("CAST(onetimer.date AS date) = CAST(:date AS date)", {
        date: accompanyingDate,
      })
      .getOne();
    expect(orphan).toBeNull();
  });
});

// be#746: server-side sort by start date, replacing the old client-side
// per-page sort — this is what actually fixes opportunities falling through
// the cracks across pages. Verifies both the ordering and that opportunities
// with no onetimer (e.g. REGULAR type) always sort last, regardless of
// direction (Postgres defaults DESC to NULLS FIRST, which would be wrong
// here).
describe("GET /opportunity sortBy=start-date", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let dealSoon: Deal;
  let dealLater: Deal;
  let dealNoDate: Deal;
  let onetimerSoon: Onetimer;
  let onetimerLater: Onetimer;
  let oppSoon: Opportunity;
  let oppLater: Opportunity;
  let oppNoDate: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (sort-start-date) ${suffix}` }),
    );

    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d;
    };
    onetimerSoon = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: inDays(5) }),
    );
    onetimerLater = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: inDays(20) }),
    );

    dealSoon = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealLater = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealNoDate = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );

    oppSoon = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Sort Soon ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealSoon.id,
        onetimerId: onetimerSoon.id,
      }),
    );
    oppLater = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Sort Later ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealLater.id,
        onetimerId: onetimerLater.id,
      }),
    );
    // No onetimer at all — must sort last in both directions.
    oppNoDate = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Sort No Date ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealNoDate.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "SortCoordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-sort-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: coordinatorUser.email, password: PASSWORD },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityRepository.delete({ id: oppSoon.id });
    await fastify.db.opportunityRepository.delete({ id: oppLater.id });
    await fastify.db.opportunityRepository.delete({ id: oppNoDate.id });
    await fastify.db.dealRepository.delete({ id: dealSoon.id });
    await fastify.db.dealRepository.delete({ id: dealLater.id });
    await fastify.db.dealRepository.delete({ id: dealNoDate.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerSoon.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerLater.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  // Relative order of our known ids within the response, ignoring whatever
  // other opportunities exist in the shared dev DB.
  function relativeOrder(data: { id: number }[], ids: number[]): number[] {
    return data.map((o) => o.id).filter((id) => ids.includes(id));
  }

  it("orders soonest-first (old-new) with no-date opportunities last", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?sortBy=start-date&sortOrder=old-new&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    expect(
      relativeOrder(data, [oppSoon.id, oppLater.id, oppNoDate.id]),
    ).toEqual([oppSoon.id, oppLater.id, oppNoDate.id]);
  });

  it("orders latest-first (new-old) with no-date opportunities still last", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?sortBy=start-date&sortOrder=new-old&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    expect(
      relativeOrder(data, [oppSoon.id, oppLater.id, oppNoDate.id]),
    ).toEqual([oppLater.id, oppSoon.id, oppNoDate.id]);
  });
});
