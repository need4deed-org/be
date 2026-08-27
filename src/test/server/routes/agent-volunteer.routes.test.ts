import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
  VolunteerStateCommunicationType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
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

describe("GET /agent/:id/volunteer-linked", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let emptyAgent: Agent;
  let opportunity: Opportunity;
  let deal: Deal;
  let person: Person;
  let volunteer: Volunteer;
  let opportunityVolunteer: OpportunityVolunteer;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let agentRolePerson: Person;
  let agentRoleCookie: string;
  let unclaimedAgent: Agent;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent ${suffix}` }),
    );
    emptyAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (no volunteers) ${suffix}` }),
    );

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );

    person = await fastify.db.personRepository.save(
      new Person({
        firstName: "Test",
        lastName: "Volunteer",
        avatarUrl: "https://cdn.need4deed.org/test-avatar.png",
      }),
    );

    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: deal.id,
        statusType: ProfileVolunteeringType.REGULAR,
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
        statusCommunication: VolunteerStateCommunicationType.CALLED,
      }),
    );

    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: agent.id,
      }),
    );

    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const loginRes = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `coordinator-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    coordinatorCookie = getCookie(loginRes.cookies, accessCookieName);

    agentRolePerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "AgentRole" }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `agentrole-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentRolePerson.id,
      }),
    );
    const agentRoleLoginRes = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: `agentrole-${suffix}@test.need4deed.org`,
        password: PASSWORD,
      },
    });
    agentRoleCookie = getCookie(agentRoleLoginRes.cookies, accessCookieName);

    // fe#911: a coordinator-created agent with no linked Person/User yet.
    unclaimedAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Unclaimed Agent ${suffix}`, unclaimed: true }),
    );

    // Real membership on `agent` (not just an AGENT-role account) — the
    // be#885 tests below need a caller with genuine pre-existing visibility
    // into this agent's volunteers, so any masking observed there comes from
    // the engagementStatus check under test, not the unrelated personIds-based
    // PII visibility rules.
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: agentRolePerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.agentRepository.delete({ id: emptyAgent.id });
    await fastify.db.agentRepository.delete({ id: unclaimedAgent.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: agentRolePerson.id });
    await fastify.db.personRepository.delete({ id: agentRolePerson.id });
    await fastify.close();
  });

  it("returns the full volunteer shape for a volunteer matched via the agent's opportunity", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();
    expect(data).toHaveLength(1);

    const [item] = data;
    expect(item.id).toBe(opportunityVolunteer.id);
    expect(item.volunteerId).toBe(volunteer.id);
    expect(item.opportunityId).toBe(opportunity.id);
    expect(item.status).toBe(OpportunityVolunteerStatusType.PENDING);
    // These are exactly the fields the broken schema ref used to strip.
    expect(item.name).toBe("Test Volunteer");
    expect(item.avatarUrl).toBe("https://cdn.need4deed.org/test-avatar.png");
    expect(item.volunteeringType).toBe(ProfileVolunteeringType.REGULAR);
    expect(item.engagement).toBe(VolunteerStateEngagementType.ACTIVE);
    expect(item.communication).toBe(VolunteerStateCommunicationType.CALLED);
    expect(item.activities).toEqual([]);
    expect(item.skills).toEqual([]);
    expect(item.languages).toEqual([]);
    expect(item.availability).toEqual([]);
    expect(item.locations).toEqual([]);
  });

  it("returns an empty array for an agent with no matched volunteers", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/${emptyAgent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  // fe#911: an unclaimed agent must stay invisible to non-coordinator/admin
  // callers here too, not just on GET /agent/:id — otherwise this route
  // leaks its existence via a 200 distinguishable from a nonexistent id.
  it("404s for an unclaimed agent when the caller isn't coordinator/admin, but not for a coordinator", async () => {
    const asAgentRole = await fastify.inject({
      method: "GET",
      url: `/agent/${unclaimedAgent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: agentRoleCookie },
    });
    expect(asAgentRole.statusCode).toBe(404);

    const asCoordinator = await fastify.inject({
      method: "GET",
      url: `/agent/${unclaimedAgent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(asCoordinator.statusCode).toBe(200);
  });

  // be#885: an INACTIVE agent's linked volunteers shouldn't read as live,
  // actionable data — driven live off engagementStatus, not a snapshot.
  it("masks volunteer identity for a non-coordinator once the agent is INACTIVE, but not for a coordinator, and unmasks again once ACTIVE", async () => {
    await fastify.db.agentRepository.update(agent.id, {
      engagementStatus: AgentEngagementStatusType.INACTIVE,
    });

    const asMember = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: agentRoleCookie },
    });
    expect(asMember.statusCode).toBe(200);
    const [maskedItem] = asMember.json().data;
    // .name joins firstName + lastName, so a masked person renders as two
    // masked tokens (each independently masked, per existing PII masking).
    expect(maskedItem.name).toMatch(/^[a-z]\*\*\* [a-z]\*\*\*$/);
    expect(maskedItem.avatarUrl).toMatch(/^[a-z]\*\*\*$/);

    const asCoordinator = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    const [coordinatorItem] = asCoordinator.json().data;
    expect(coordinatorItem.name).toBe("Test Volunteer");

    await fastify.db.agentRepository.update(agent.id, {
      engagementStatus: AgentEngagementStatusType.ACTIVE,
    });

    const asMemberAfterReactivation = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/volunteer-linked`,
      cookies: { [accessCookieName]: agentRoleCookie },
    });
    const [unmaskedItem] = asMemberAfterReactivation.json().data;
    expect(unmaskedItem.name).toBe("Test Volunteer");
  });
});
