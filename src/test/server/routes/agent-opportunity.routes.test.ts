import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
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

// be#885: an INACTIVE agent's opportunities/volunteers shouldn't read as
// live, actionable data — title and linked-volunteer identity get masked,
// live off the agent's current engagementStatus.
describe("GET /agent/:id/opportunity-linked", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let opportunity: Opportunity;
  let deal: Deal;
  let person: Person;
  let volunteer: Volunteer;
  let opportunityVolunteer: OpportunityVolunteer;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;
  let agentRolePerson: Person;
  let agentRoleCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
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

    // Real membership on `agent` (not just an AGENT-role account) — this
    // caller must have genuine pre-existing visibility into the agent's
    // volunteers, so any masking observed in the tests below comes from the
    // engagementStatus check under test, not the unrelated personIds-based
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
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.userRepository.delete({ personId: agentRolePerson.id });
    await fastify.db.personRepository.delete({ id: agentRolePerson.id });
    await fastify.close();
  });

  it("returns the opportunity and volunteer identity unmasked while the agent is ACTIVE", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/opportunity-linked`,
      cookies: { [accessCookieName]: agentRoleCookie },
    });

    expect(res.statusCode).toBe(200);
    const [item] = res.json().data;
    expect(item.title).toBe(opportunity.title);
    expect(item.volunteers[0].name).toBe("Test Volunteer");
  });

  it("masks title and volunteer identity for a non-coordinator once the agent is INACTIVE", async () => {
    await fastify.db.agentRepository.update(agent.id, {
      engagementStatus: AgentEngagementStatusType.INACTIVE,
    });

    const res = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/opportunity-linked`,
      cookies: { [accessCookieName]: agentRoleCookie },
    });

    expect(res.statusCode).toBe(200);
    const [item] = res.json().data;
    expect(item.title).toMatch(/^[a-z]\*\*\*$/);
    expect(item.title).not.toBe(opportunity.title);
    expect(item.volunteers[0].name).not.toBe("Test Volunteer");

    // Coordinator keeps full visibility regardless of engagementStatus.
    const asCoordinator = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/opportunity-linked`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    const [coordinatorItem] = asCoordinator.json().data;
    expect(coordinatorItem.title).toBe(opportunity.title);
    expect(coordinatorItem.volunteers[0].name).toBe("Test Volunteer");
  });

  it("unmasks again immediately once the agent flips back to ACTIVE", async () => {
    await fastify.db.agentRepository.update(agent.id, {
      engagementStatus: AgentEngagementStatusType.ACTIVE,
    });

    const res = await fastify.inject({
      method: "GET",
      url: `/agent/${agent.id}/opportunity-linked`,
      cookies: { [accessCookieName]: agentRoleCookie },
    });

    const [item] = res.json().data;
    expect(item.title).toBe(opportunity.title);
    expect(item.volunteers[0].name).toBe("Test Volunteer");
  });
});
