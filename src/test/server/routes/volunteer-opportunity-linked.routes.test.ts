import { FastifyInstance } from "fastify";
import {
  OpportunityMatchStatusType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateMatchType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
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

describe("DELETE /volunteer/:id/opportunity-linked/:m2mId", () => {
  let fastify: FastifyInstance;

  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  let opportunityVolunteer: OpportunityVolunteer;
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

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (unmatch via volunteer route) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
      }),
    );
    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );
    // Set deterministically rather than relying on OpportunityVolunteer's
    // fire-and-forget @AfterInsert hook, so the "before" state for the
    // recompute assertion below isn't a race.
    await fastify.db.volunteerRepository.update(
      { id: volunteer.id },
      { statusMatch: VolunteerStateMatchType.MATCHED },
    );
    await fastify.db.opportunityRepository.update(
      { id: opportunity.id },
      { statusMatch: OpportunityMatchStatusType.MATCHED },
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
        email: `coordinator-vol-unmatch-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `agent-vol-unmatch-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
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

    agentCookie = await login(`agent-vol-unmatch-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-vol-unmatch-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    // The match link is deleted by the DELETE call itself in the test below;
    // this is best-effort in case a test fails before reaching that point.
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.close();
  });

  it("403s when a non-coordinator tries to remove the link", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}/opportunity-linked/${opportunityVolunteer.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404s for a nonexistent m2m relation", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}/opportunity-linked/999999999`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("removes the link and recomputes statusMatch on both the volunteer and opportunity sides", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/volunteer/${volunteer.id}/opportunity-linked/${opportunityVolunteer.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(200);

    expect(
      await fastify.db.opportunityVolunteerRepository.findOneBy({
        id: opportunityVolunteer.id,
      }),
    ).toBeNull();

    // Regression for be#808: repository.delete() never fires the
    // OpportunityVolunteer entity's @AfterRemove hook, so both sides'
    // statusMatch must be recomputed explicitly by the route handler —
    // otherwise they stay frozen at MATCHED forever.
    const survivingVolunteer = await fastify.db.volunteerRepository.findOneBy({
      id: volunteer.id,
    });
    expect(survivingVolunteer?.statusMatch).toBe(
      VolunteerStateMatchType.NEEDS_REMATCH,
    );

    const survivingOpportunity =
      await fastify.db.opportunityRepository.findOneBy({
        id: opportunity.id,
      });
    expect(survivingOpportunity?.statusMatch).toBe(
      OpportunityMatchStatusType.NEEDS_REMATCH,
    );
  });
});
