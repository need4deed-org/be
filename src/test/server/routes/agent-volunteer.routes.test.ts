import { FastifyInstance } from "fastify";
import {
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
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.agentRepository.delete({ id: emptyAgent.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
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
});
