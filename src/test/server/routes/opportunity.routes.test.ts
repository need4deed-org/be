import { FastifyInstance } from "fastify";
import {
  AgentMembershipStatus,
  AgentRoleType,
  AgentVolunteerSearchType,
  EntityTableName,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Address from "../../../data/entity/location/address.entity";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { formatDate, formatTime } from "../../../services/utils";
import { randomNumericSuffix } from "../../random";

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
  let pendingContactPerson: Person;
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
    pendingContactPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "PendingContact" }),
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

    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: ownAgent.id,
        personId: pendingContactPerson.id,
        role: AgentRoleType.OTHER,
        status: AgentMembershipStatus.PENDING,
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

  it("lets an agent patch fields beyond status on their own opportunity (be#870)", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: {
        statusOpportunity: OpportunityStatusType.ACTIVE,
        title: "Agent renamed",
      },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.status).toBe(OpportunityStatusType.ACTIVE);
    expect(updated.title).toBe("Agent renamed");
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

  // Agents may now edit their own opportunity's fields generally (be#870),
  // but reassigning it to a *different* agent stays coordinator-only.
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

  // agentBody.id === undefined is parser-opportunity-patch-data.ts's
  // self-edit-agent path (sets Agent.title from agentBody.name) — not a
  // relink, so it must not be blocked by the agent.agentId !== opportunity's
  // agentId check above (be#871 review).
  it("lets an agent edit their own agent's name via agent.name with no id", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { agent: { name: "Renamed via self-edit" } },
    });
    expect(res.statusCode).toBe(204);

    const updatedAgent = await fastify.db.agentRepository.findOneByOrFail({
      id: ownAgent.id,
    });
    expect(updatedAgent.title).toBe("Renamed via self-edit");

    // Restore for any later test in this file that asserts on ownAgent.title.
    await fastify.db.agentRepository.update(
      { id: ownAgent.id },
      { title: ownAgent.title },
    );
  });

  it("lets an agent patch agent.id pointing at their own (unchanged) agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { agent: { id: ownAgent.id } },
    });
    expect(res.statusCode).toBe(204);

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

  // be#1045: the create-path equivalent of this error used to interpolate
  // the raw agent id into the client-facing message.
  it("does not expose the internal agent id when relinking to a nonexistent agent", async () => {
    const missingAgentId = 2_147_483_647;
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { agent: { id: missingAgentId } },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: "NotFoundError",
      message: "The selected NGO could not be found.",
    });
    expect(res.body).not.toContain(String(missingAgentId));
  });

  it("lets an agent relink their opportunity's contact to a registered contact of their own agent (be#870)", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: {
        statusOpportunity: OpportunityStatusType.ACTIVE,
        contact: { id: agentContactPerson.id },
      },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(updated.contactPersonId).toBe(agentContactPerson.id);

    // Reset so later tests in this file see no contact set.
    await fastify.db.opportunityRepository.update(
      { id: ownOpportunity.id },
      { contactPersonId: null },
    );
  });

  // unrelatedPerson is only a registered contact of otherAgent — an agent
  // relinking their own opportunity's contact must still be validated
  // against their own agent's registered contacts, same as a coordinator.
  it("404s when an agent tries to relink their opportunity's contact to a person who isn't a registered contact of their agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { contact: { id: unrelatedPerson.id } },
    });
    expect(res.statusCode).toBe(404);

    const unchanged = await fastify.db.opportunityRepository.findOneByOrFail({
      id: ownOpportunity.id,
    });
    expect(unchanged.contactPersonId).toBeFalsy();
  });

  // pendingContactPerson IS a member of ownAgent, just not approved yet.
  // A PENDING membership grants nothing, so it cannot be set as a contact.
  it("404s when an agent tries to relink their opportunity's contact to a PENDING member of their own agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${ownOpportunity.id}`,
      cookies: { [accessCookieName]: agentCookie },
      payload: { contact: { id: pendingContactPerson.id } },
    });
    expect(res.statusCode).toBe(404);

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
  let newAgent: Agent;
  let opportunity: Opportunity;
  let deal: Deal;
  let orphanOpportunity: Opportunity;
  let orphanDeal: Deal;
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
    newAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (search-cascade-relink) ${suffix}` }),
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
    // Mirrors a legacy/orphaned row with no owning agent (agent_id is
    // nullable at the DB level) — the search-status cascade must not turn a
    // previously-succeeding status PATCH into a 400 just because there's no
    // agent to cascade to (be#868 review).
    orphanDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    orphanOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (search-cascade-orphan) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.INACTIVE,
        dealId: orphanDeal.id,
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
    await fastify.db.opportunityRepository.delete({
      id: orphanOpportunity.id,
    });
    await fastify.db.dealRepository.delete({ id: orphanDeal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.agentRepository.delete({ id: newAgent.id });
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

  // Regression test for the stale-agent bug caught in be#868 review: a
  // request that relinks `agent.id` and sets a searching statusOpportunity in
  // the same PATCH must cascade to the *new* agent, not the one the
  // opportunity is being relinked away from.
  it("cascades the newly-linked agent to SEARCHING, not the one it's being relinked away from", async () => {
    // Reset both agents to a known, non-searching baseline first — the
    // previous test already left `agent` at SEARCHING.
    await fastify.db.agentRepository.update(
      { id: agent.id },
      { searchStatus: AgentVolunteerSearchType.NOT_NEEDED },
    );
    await fastify.db.agentRepository.update(
      { id: newAgent.id },
      { searchStatus: AgentVolunteerSearchType.NOT_NEEDED },
    );

    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        agent: { id: newAgent.id },
        statusOpportunity: OpportunityStatusType.ACTIVE,
      },
    });
    expect(res.statusCode).toBe(204);

    const updatedOldAgent = await fastify.db.agentRepository.findOneByOrFail({
      id: agent.id,
    });
    expect(updatedOldAgent.searchStatus).toBe(
      AgentVolunteerSearchType.NOT_NEEDED,
    );

    const updatedNewAgent = await fastify.db.agentRepository.findOneByOrFail({
      id: newAgent.id,
    });
    expect(updatedNewAgent.searchStatus).toBe(
      AgentVolunteerSearchType.SEARCHING,
    );

    // Restore for isolation, though no later test in this describe depends
    // on the opportunity's agent.
    await fastify.db.opportunityRepository.update(
      { id: opportunity.id },
      { agentId: agent.id },
    );
  });

  // Regression test for be#868 review: agent_id is nullable at the DB level
  // (legacy/orphaned rows) — the cascade must not turn what would otherwise
  // be a successful status patch into a 400 just because there's no agent.
  it("still applies the status patch when the opportunity has no agent to cascade to", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${orphanOpportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { statusOpportunity: OpportunityStatusType.ACTIVE },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: orphanOpportunity.id,
    });
    expect(updated.status).toBe(OpportunityStatusType.ACTIVE);
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

describe("PATCH /opportunity/:id clears stale accompanying PII on type change (be#780)", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let deal: Deal;
  let opportunity: Opportunity;
  let accompanying: Accompanying;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (clear-pii) ${suffix}` }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    accompanying = await fastify.db.accompanyingRepository.save(
      new Accompanying({
        address: "Secret Street 1",
        name: "Refugee Secret Name",
        phone: "+491234567",
        email: "secret@example.com",
      }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (clear-pii) ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
        accompanyingId: accompanying.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-clear-pii-${suffix}@test.need4deed.org`,
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

  afterEach(async () => {
    const updated = await fastify.db.opportunityRepository.findOneBy({
      id: opportunity.id,
    });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    if (updated?.onetimerId) {
      await fastify.db.onetimerRepository.delete({ id: updated.onetimerId });
    }
    if (updated?.accompanyingId) {
      await fastify.db.accompanyingRepository.delete({
        id: updated.accompanyingId,
      });
    }
    await fastify.db.accompanyingRepository.delete({ id: accompanying.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
  });

  it("deletes the old accompanying row and nulls accompanyingId when switching ACCOMPANYING to EVENTS", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunity_type: "events",
        event: { date: "2026-09-01", time: "12:00" },
      },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: opportunity.id,
    });
    expect(updated.accompanyingId).toBeNull();

    const staleRow = await fastify.db.accompanyingRepository.findOneBy({
      id: accompanying.id,
    });
    expect(staleRow).toBeNull();
  });

  it("no longer returns the old refugee's PII from GET after switching to EVENTS", async () => {
    await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunity_type: "events",
        event: { date: "2026-09-01", time: "12:00" },
      },
    });

    const getRes = await fastify.inject({
      method: "GET",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(getRes.statusCode).toBe(200);
    const body = getRes.json().data;
    expect(body.accompanyingDetails?.refugeeName).toBeUndefined();
    expect(body.accompanyingDetails?.refugeeNumber).toBeUndefined();
    expect(body.accompanyingDetails?.appointmentAddress).toBeUndefined();
  });

  it("does not touch the accompanying row when the type doesn't change away from ACCOMPANYING", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { numberVolunteers: 3 },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.opportunityRepository.findOneByOrFail({
      id: opportunity.id,
    });
    expect(updated.accompanyingId).toBe(accompanying.id);

    const stillThere = await fastify.db.accompanyingRepository.findOneBy({
      id: accompanying.id,
    });
    expect(stillThere).not.toBeNull();
  });
});

// be#890: dtoOpportunityGet backs this route and must set every field
// ApiOpportunityGet's response schema now requires (inherited from the
// widened ApiOpportunityGetList) — a missing required field makes
// fast-json-stringify throw, not silently strip, so this exercises that path.
describe("GET /opportunity/:id", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let deal: Deal;
  let onetimer: Onetimer;
  let opportunity: Opportunity;
  let opportunityNoDate: Opportunity;
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
      new Agent({ title: `Test Agent (get-by-id) ${suffix}` }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    onetimer = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: new Date("2026-06-15T09:30:00Z") }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (get-by-id) ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: deal.id,
        onetimerId: onetimer.id,
      }),
    );
    opportunityNoDate = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity No Date (get-by-id) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "GetByIdCoordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-get-by-id-${suffix}@test.need4deed.org`,
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
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.opportunityRepository.delete({ id: opportunityNoDate.id });
    await fastify.db.onetimerRepository.delete({ id: onetimer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("returns appointmentDate/appointmentTime derived from onetimer", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();
    expect(data.appointmentDate).toBe("2026-06-15");
    expect(data.appointmentTime).toBe("09:30");
  });

  it("returns null appointmentDate/appointmentTime when there is no onetimer", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${opportunityNoDate.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();
    expect(data.appointmentDate).toBeNull();
    expect(data.appointmentTime).toBeNull();
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

  it("exposes appointmentDate/appointmentTime derived from onetimer, null when absent", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?sortBy=start-date&sortOrder=old-new&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    const byId = (id: number) => data.find((o: { id: number }) => o.id === id);

    expect(byId(oppSoon.id)).toMatchObject({
      appointmentDate: formatDate(onetimerSoon.date),
      appointmentTime: formatTime(onetimerSoon.date),
    });
    expect(byId(oppLater.id)).toMatchObject({
      appointmentDate: formatDate(onetimerLater.date),
      appointmentTime: formatTime(onetimerLater.date),
    });
    expect(byId(oppNoDate.id)).toMatchObject({
      appointmentDate: null,
      appointmentTime: null,
    });
  });
});

// be#889: appointmentDateFrom/To + hasAppointmentDate + excludeAccompanying
// filters on the calendar-view query. The sortBy=start-date case specifically
// covers a known risk: that sort path excludes "onetimer" from the relations
// it eager-loads and instead manually joins it under its own alias
// ("onetimerSort") to avoid double-hydrating it — adding a relation-nested
// `where.onetimer.date` condition must not conflict with that manual join.
describe("GET /opportunity appointment date-range filters", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let dealInRange: Deal;
  let dealOutOfRange: Deal;
  let dealNoDate: Deal;
  let dealAccompanying: Deal;
  let onetimerInRange: Onetimer;
  let onetimerOutOfRange: Onetimer;
  let onetimerAccompanying: Onetimer;
  let oppInRange: Opportunity;
  let oppOutOfRange: Opportunity;
  let oppNoDate: Opportunity;
  let oppAccompanying: Opportunity;
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
      new Agent({ title: `Test Agent (appointment-filters) ${suffix}` }),
    );

    onetimerInRange = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: new Date("2026-06-15T09:30:00Z") }),
    );
    onetimerOutOfRange = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: new Date("2026-07-15T09:30:00Z") }),
    );
    onetimerAccompanying = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: new Date("2026-06-20T14:00:00Z") }),
    );

    dealInRange = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealOutOfRange = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealNoDate = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealAccompanying = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );

    oppInRange = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Appt In Range ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealInRange.id,
        onetimerId: onetimerInRange.id,
      }),
    );
    oppOutOfRange = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Appt Out Of Range ${suffix}`,
        type: OpportunityType.EVENTS,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealOutOfRange.id,
        onetimerId: onetimerOutOfRange.id,
      }),
    );
    oppNoDate = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Appt No Date ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealNoDate.id,
      }),
    );
    oppAccompanying = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Appt Accompanying In Range ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealAccompanying.id,
        onetimerId: onetimerAccompanying.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "ApptFilterCoordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    const coordinatorUser = await fastify.db.userRepository.save(
      new User({
        email: `coordinator-appt-filter-${suffix}@test.need4deed.org`,
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
    await fastify.db.opportunityRepository.delete({ id: oppInRange.id });
    await fastify.db.opportunityRepository.delete({ id: oppOutOfRange.id });
    await fastify.db.opportunityRepository.delete({ id: oppNoDate.id });
    await fastify.db.opportunityRepository.delete({ id: oppAccompanying.id });
    await fastify.db.dealRepository.delete({ id: dealInRange.id });
    await fastify.db.dealRepository.delete({ id: dealOutOfRange.id });
    await fastify.db.dealRepository.delete({ id: dealNoDate.id });
    await fastify.db.dealRepository.delete({ id: dealAccompanying.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerInRange.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerOutOfRange.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerAccompanying.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  const knownIds = () => [
    oppInRange.id,
    oppOutOfRange.id,
    oppNoDate.id,
    oppAccompanying.id,
  ];

  function relativeIds(data: { id: number }[]): number[] {
    return data.map((o) => o.id).filter((id) => knownIds().includes(id));
  }

  it("returns only opportunities with an onetimer inside the date range", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?appointmentDateFrom=2026-06-01&appointmentDateTo=2026-06-30&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    expect(relativeIds(data).sort()).toEqual(
      [oppInRange.id, oppAccompanying.id].sort(),
    );
  });

  it("also excludes accompanying-type opportunities when excludeAccompanying=true", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?appointmentDateFrom=2026-06-01&appointmentDateTo=2026-06-30&excludeAccompanying=true&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    expect(relativeIds(data)).toEqual([oppInRange.id]);
  });

  it("hasAppointmentDate=true alone excludes only the no-date opportunity", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?hasAppointmentDate=true&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    const ids = relativeIds(data);
    expect(ids).toContain(oppInRange.id);
    expect(ids).toContain(oppOutOfRange.id);
    expect(ids).toContain(oppAccompanying.id);
    expect(ids).not.toContain(oppNoDate.id);
  });

  it("throws a 400 on an unparseable appointmentDateFrom", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?appointmentDateFrom=not-a-date&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(400);
  });

  // The join-safety risk: sortBy=start-date excludes "onetimer" from its
  // eager-loaded relations and manually joins it under a different alias
  // for ordering — the date-range where-condition must still apply correctly
  // on top of that, not silently no-op or duplicate-join-error.
  it("still applies the date range + excludeAccompanying correctly when combined with sortBy=start-date", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity?appointmentDateFrom=2026-06-01&appointmentDateTo=2026-06-30&excludeAccompanying=true&sortBy=start-date&sortOrder=old-new&limit=120",
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const { data } = res.json();
    expect(relativeIds(data)).toEqual([oppInRange.id]);
  });
});

describe("GET /opportunity map-pin lat/lon (be#662)", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let postcode: Postcode;
  let address: Address;
  let deal: Deal;
  let oppNew: Opportunity;
  let oppActive: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const numericSuffix = randomNumericSuffix();
  const LAT = 52.52;
  const LON = 13.405;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcodeRepository = getRepository(dataSource, Postcode);
    postcode = await postcodeRepository.save(
      new Postcode({
        value: `1${numericSuffix}`,
        latitude: LAT,
        longitude: LON,
      }),
    );
    const addressRepository = getRepository(dataSource, Address);
    address = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (map-pin) ${suffix}`,
        addressId: address.id,
      }),
    );

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    oppNew = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Map Pin NEW ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );
    oppActive = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Map Pin ACTIVE ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "MapPinCoordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-map-pin-${suffix}@test.need4deed.org`,
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
        email: `coordinator-map-pin-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityRepository.delete({ id: oppNew.id });
    await fastify.db.opportunityRepository.delete({ id: oppActive.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: address.id });
    await getRepository(dataSource, Postcode).delete({ id: postcode.id });
    await fastify.close();
  });

  it("serializes the agent's geocoded coordinates as numeric lat/lon for a NEW opportunity", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(oppNew.title)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    const found = body.data.find((o: { id: number }) => o.id === oppNew.id);
    expect(found).toBeDefined();
    expect(found.lat).toBe(LAT);
    expect(found.lon).toBe(LON);
    expect(typeof found.lat).toBe("number");
    expect(typeof found.lon).toBe("number");
  });

  it("nulls lat/lon for a status outside NEW/SEARCHING, even with a geocoded agent", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(oppActive.title)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    const found = body.data.find((o: { id: number }) => o.id === oppActive.id);
    expect(found).toBeDefined();
    expect(found.lat).toBeNull();
    expect(found.lon).toBeNull();
  });
});

describe("GET /opportunity map-pin district-centroid fallback (be#662)", () => {
  let fastify: FastifyInstance;
  let district: District;
  let postcodeA: Postcode;
  let postcodeB: Postcode;
  let mappingA: DistrictPostcode;
  let mappingB: DistrictPostcode;
  let agentNoAddress: Agent;
  let deal: Deal;
  let oppNew: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const numericSuffix = randomNumericSuffix();
  const LAT_A = 52.4;
  const LON_A = 13.3;
  const LAT_B = 52.6;
  const LON_B = 13.5;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const districtRepository = dataSource.getRepository(District);
    const postcodeRepository = getRepository(dataSource, Postcode);
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);

    district = await districtRepository.save(
      new District({ title: `Test Centroid Fallback District ${suffix}` }),
    );
    postcodeA = await postcodeRepository.save(
      new Postcode({
        value: `1${numericSuffix}`,
        latitude: LAT_A,
        longitude: LON_A,
      }),
    );
    postcodeB = await postcodeRepository.save(
      new Postcode({
        value: `2${numericSuffix}`,
        latitude: LAT_B,
        longitude: LON_B,
      }),
    );
    mappingA = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcodeA.id,
        districtId: district.id,
      }),
    );
    mappingB = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: postcodeB.id,
        districtId: district.id,
      }),
    );

    // Agent has NO address (no geocoded coordinates of its own), but its
    // districtId is already set directly — this exercises
    // addDistrictToOpportunity's "agent.districtId" fast path (be#895),
    // which only ever sets opportunity.districtId, never the full
    // opportunity.district relation object. The fallback must still resolve
    // the centroid via that bare id (be#662 review finding).
    agentNoAddress = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent No Address (map-pin) ${suffix}`,
        districtId: district.id,
      }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcodeA.id }),
    );
    oppNew = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Map Pin Centroid Fallback ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agentNoAddress.id,
        dealId: deal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "MapPinCentroidCoordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-map-pin-centroid-${suffix}@test.need4deed.org`,
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
        email: `coordinator-map-pin-centroid-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityRepository.delete({ id: oppNew.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agentNoAddress.id });
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);
    await districtPostcodeRepository.delete({ id: mappingA.id });
    await districtPostcodeRepository.delete({ id: mappingB.id });
    await dataSource.getRepository(District).delete({ id: district.id });
    await getRepository(dataSource, Postcode).delete({ id: postcodeA.id });
    await getRepository(dataSource, Postcode).delete({ id: postcodeB.id });
    await fastify.close();
  });

  it("falls back to the district centroid, resolved from a bare districtId with no district relation preloaded", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(oppNew.title)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    const found = body.data.find((o: { id: number }) => o.id === oppNew.id);
    expect(found).toBeDefined();
    expect(found.lat).toBeCloseTo((LAT_A + LAT_B) / 2);
    expect(found.lon).toBeCloseTo((LON_A + LON_B) / 2);
  });
});

describe("GET /opportunity map-pin falls back to district centroid for a masked caller (be#662 review)", () => {
  let fastify: FastifyInstance;
  let district: District;
  let districtPostcode: Postcode;
  let mapping: DistrictPostcode;
  let agentPostcode: Postcode;
  let agentAddress: Address;
  let agent: Agent;
  let deal: Deal;
  let oppNew: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let unrelatedPerson: Person;
  let unrelatedUserCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const numericSuffix = randomNumericSuffix();
  // Agent's own coordinates — visible only to a caller who can see this
  // agent. Deliberately different from the district centroid below so the
  // two outcomes are unambiguous.
  const AGENT_LAT = 52.52;
  const AGENT_LON = 13.405;
  const DISTRICT_LAT = 52.4;
  const DISTRICT_LON = 13.3;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const districtRepository = dataSource.getRepository(District);
    const postcodeRepository = getRepository(dataSource, Postcode);
    const addressRepository = getRepository(dataSource, Address);
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);

    district = await districtRepository.save(
      new District({ title: `Test Masked Fallback District ${suffix}` }),
    );
    districtPostcode = await postcodeRepository.save(
      new Postcode({
        value: `1${numericSuffix}`,
        latitude: DISTRICT_LAT,
        longitude: DISTRICT_LON,
      }),
    );
    mapping = await districtPostcodeRepository.save(
      new DistrictPostcode({
        postcodeId: districtPostcode.id,
        districtId: district.id,
      }),
    );

    agentPostcode = await postcodeRepository.save(
      new Postcode({
        value: `2${numericSuffix}`,
        latitude: AGENT_LAT,
        longitude: AGENT_LON,
      }),
    );
    agentAddress = await addressRepository.save(
      new Address({ postcodeId: agentPostcode.id }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (masked map-pin) ${suffix}`,
        addressId: agentAddress.id,
        districtId: district.id,
      }),
    );

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: agentPostcode.id }),
    );
    oppNew = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Map Pin Masked Fallback ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "MaskedFallbackCoordinator" }),
    );
    unrelatedPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "MaskedFallbackUnrelated" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-masked-fallback-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    // USER has no visibility into any agent (resolveCallerVisibility), so
    // mask.ts nulls this agent's address/postcode for this caller — the
    // exact condition the district-centroid fallback exists for.
    await fastify.db.userRepository.save(
      new User({
        email: `unrelated-user-masked-fallback-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.USER,
        isActive: true,
        personId: unrelatedPerson.id,
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
    coordinatorCookie = await login(
      `coordinator-masked-fallback-${suffix}@test.need4deed.org`,
    );
    unrelatedUserCookie = await login(
      `unrelated-user-masked-fallback-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: unrelatedPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: unrelatedPerson.id });
    await fastify.db.opportunityRepository.delete({ id: oppNew.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: agentAddress.id });
    const districtPostcodeRepository =
      dataSource.getRepository(DistrictPostcode);
    await districtPostcodeRepository.delete({ id: mapping.id });
    await dataSource.getRepository(District).delete({ id: district.id });
    await getRepository(dataSource, Postcode).delete({ id: agentPostcode.id });
    await getRepository(dataSource, Postcode).delete({
      id: districtPostcode.id,
    });
    await fastify.close();
  });

  it("shows the agent's own coordinates to a caller who can see that agent", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(oppNew.title)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const found = res
      .json()
      .data.find((o: { id: number }) => o.id === oppNew.id);
    expect(found).toBeDefined();
    expect(found.lat).toBe(AGENT_LAT);
    expect(found.lon).toBe(AGENT_LON);
  });

  it("falls back to the district centroid once the agent's address is masked for a caller without visibility", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(oppNew.title)}`,
      cookies: { [accessCookieName]: unrelatedUserCookie },
    });
    expect(res.statusCode).toBe(200);

    const found = res
      .json()
      .data.find((o: { id: number }) => o.id === oppNew.id);
    expect(found).toBeDefined();
    expect(found.lat).toBe(DISTRICT_LAT);
    expect(found.lon).toBe(DISTRICT_LON);
  });
});

describe("GET /opportunity RAC masking + myMatchStatus for volunteers (be#1039)", () => {
  let fastify: FastifyInstance;
  let agentAddress: Address;
  let agent: Agent;
  let deal: Deal;
  let opportunity: Opportunity;
  const persons: Person[] = [];
  const volunteers: Volunteer[] = [];
  const volunteerDeals: Deal[] = [];
  const cookies: Record<string, string> = {};

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const AGENT_TITLE = `Test RAC (be#1039) ${suffix}`;
  const AGENT_STREET = `Geheimstraße ${suffix}`;

  // Volunteer callers, keyed by their link to the opportunity (null = none).
  const VOLUNTEER_LINKS: Record<string, OpportunityVolunteerStatusType | null> =
    {
      unlinked: null,
      pending: OpportunityVolunteerStatusType.PENDING,
      matched: OpportunityVolunteerStatusType.MATCHED,
      active: OpportunityVolunteerStatusType.ACTIVE,
      past: OpportunityVolunteerStatusType.PAST,
    };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    agentAddress = await getRepository(dataSource, Address).save(
      new Address({
        street: AGENT_STREET,
        city: "Berlin",
        postcodeId: postcode.id,
      }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: AGENT_TITLE, addressId: agentAddress.id }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (be#1039) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const addUser = async (key: string, role: UserRole): Promise<Person> => {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Test", lastName: `be1039-${key}` }),
      );
      persons.push(person);
      await fastify.db.userRepository.save(
        new User({
          email: `be1039-${key}-${suffix}@test.need4deed.org`,
          password: pwHash,
          role,
          isActive: true,
          personId: person.id,
        }),
      );
      return person;
    };

    for (const [key, status] of Object.entries(VOLUNTEER_LINKS)) {
      const person = await addUser(key, UserRole.VOLUNTEER);
      const volunteerDeal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      volunteerDeals.push(volunteerDeal);
      const volunteer = await fastify.db.volunteerRepository.save(
        new Volunteer({ dealId: volunteerDeal.id, personId: person.id }),
      );
      volunteers.push(volunteer);
      if (status) {
        await fastify.db.opportunityVolunteerRepository.save(
          new OpportunityVolunteer({
            opportunityId: opportunity.id,
            volunteerId: volunteer.id,
            status,
          }),
        );
      }
    }
    await addUser("coordinator", UserRole.COORDINATOR);
    const agentMember = await addUser("agent", UserRole.AGENT);
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: agentMember.id,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    for (const key of [
      ...Object.keys(VOLUNTEER_LINKS),
      "coordinator",
      "agent",
    ]) {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: `be1039-${key}-${suffix}@test.need4deed.org`,
          password: PASSWORD,
        },
      });
      cookies[key] = getCookie(res.cookies, accessCookieName);
    }
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      opportunityId: opportunity.id,
    });
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    for (const volunteer of volunteers) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const volunteerDeal of volunteerDeals) {
      await fastify.db.dealRepository.delete({ id: volunteerDeal.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: agentAddress.id });
    await fastify.close();
  });

  const getOne = async (caller: string) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: cookies[caller] },
    });
    expect(res.statusCode).toBe(200);
    return res.json().data;
  };

  const getFromList = async (caller: string) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(opportunity.title)}`,
      cookies: { [accessCookieName]: cookies[caller] },
    });
    expect(res.statusCode).toBe(200);
    const found = res
      .json()
      .data.find((o: { id: number }) => o.id === opportunity.id);
    expect(found).toBeDefined();
    return found;
  };

  it.each(["unlinked", "pending", "past"])(
    "masks the RAC name and address for a %s volunteer",
    async (caller) => {
      const data = await getOne(caller);
      expect(data.agent.name).not.toContain(AGENT_TITLE);
      expect(data.agentTitle).not.toContain(AGENT_TITLE);
      expect(data.agent.address).not.toContain(AGENT_STREET);
      expect(data.myMatchStatus).toBe(VOLUNTEER_LINKS[caller]);

      expect((await getFromList(caller)).agentTitle).not.toContain(AGENT_TITLE);
    },
  );

  it.each(["matched", "active"])(
    "shows the RAC name and address to a %s volunteer",
    async (caller) => {
      const data = await getOne(caller);
      expect(data.agent.name).toBe(AGENT_TITLE);
      expect(data.agentTitle).toBe(AGENT_TITLE);
      expect(data.agent.address).toContain(AGENT_STREET);
      expect(data.myMatchStatus).toBe(VOLUNTEER_LINKS[caller]);

      expect((await getFromList(caller)).agentTitle).toBe(AGENT_TITLE);
    },
  );

  // Review of be#1040: the opportunity's agentId must not let a volunteer
  // look the RAC up on the /agent routes instead.
  it.each([
    () => `/agent/${agent.id}`,
    () => `/agent?filter[search]=${encodeURIComponent(AGENT_TITLE)}`,
    () => `/agent/${agent.id}/opportunity-linked`,
    () => `/agent/${agent.id}/volunteer-linked`,
    () => `/agent/${agent.id}/communication`,
  ])("403s a volunteer on the agent routes (%#)", async (url) => {
    for (const caller of ["pending", "matched"]) {
      const res = await fastify.inject({
        method: "GET",
        url: url(),
        cookies: { [accessCookieName]: cookies[caller] },
      });
      expect(res.statusCode).toBe(403);
    }
  });

  it("still lets an agent member read their own agent", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: cookies.agent },
    });
    expect(res.statusCode).toBe(200);
  });

  it.each(["coordinator", "agent"])(
    "leaves the RAC unmasked and omits myMatchStatus for a %s",
    async (caller) => {
      const data = await getOne(caller);
      expect(data.agent.name).toBe(AGENT_TITLE);
      expect(data.agent.address).toContain(AGENT_STREET);
      expect(data).not.toHaveProperty("myMatchStatus");
    },
  );
});

// opportunity.deal_id is nullable; a single deal-less opportunity used to 500
// the whole coordinator list (null deal in addCategoryToDeal / the DTOs) —
// surfaced by parallel test runs, where other files' deal-less fixtures leak
// into an unfiltered list (be#999).
describe("GET /opportunity with a deal-less opportunity (be#999)", () => {
  let fastify: FastifyInstance;
  let opportunity: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const coordinatorEmail = `coordinator-no-deal-${suffix}@test.need4deed.org`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test No Deal ${suffix}`,
        type: OpportunityType.REGULAR,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "NoDealCoordinator" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: coordinatorEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: coordinatorEmail, password: PASSWORD },
    });
    coordinatorCookie = getCookie(login.cookies, accessCookieName);
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.close();
  });

  it("lists it with a null category and empty deal-derived lists instead of 500ing", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?filter[search]=${encodeURIComponent(opportunity.title)}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    const found = res
      .json()
      .data.find((o: { id: number }) => o.id === opportunity.id);
    expect(found).toBeDefined();
    // OptionId is string|number, so a null category id serializes as "" —
    // same as a deal whose categoryId is still null.
    expect(found.category.id).toBeFalsy();
    expect(found.languages).toEqual([]);
    expect(found.activities).toEqual([]);
    expect(found.location).toEqual([]);
  });

  it("serves it by id", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.skills).toEqual([]);
  });
});
