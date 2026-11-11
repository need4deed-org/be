import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
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
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type AgentKey = "owner" | "other";
type OpportunityKey = "own" | "suggested" | "unrelated";
type Caller = "owned" | "platform";

describe("Owned volunteers only see their NGO's opportunities", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  const agents = {} as Record<AgentKey, Agent>;
  const opportunities = {} as Record<OpportunityKey, Opportunity>;
  const volunteers = {} as Record<Caller, Volunteer>;
  const persons: Person[] = [];
  const deals: Deal[] = [];
  const cookies = {} as Record<Caller, string>;

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] },
    });

  let districtId: number;
  const sortedIds = (items: { id: number }[]) =>
    items.map(({ id }) => id).sort((a, b) => a - b);
  const idsOf = (...keys: OpportunityKey[]) =>
    sortedIds(keys.map((key) => opportunities[key]));
  const allIds = () => sortedIds(Object.values(opportunities));

  const listedIds = async (url: string, as: Caller) => {
    const res = await get(url, as);
    expect(res.statusCode).toBe(200);
    return sortedIds(res.json().data);
  };
  const opportunityListUrl = () =>
    `/opportunity?limit=100&filter[search]=${suffix}`;
  const volunteerOpportunityListUrl = () =>
    `/volunteer/opportunity?limit=100&type=${OpportunityType.REGULAR}&status=${OpportunityStatusType.ACTIVE}&search=${suffix}`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    ({ id: districtId } = await fastify.db.districtRepository.findOneOrFail({
      where: {},
    }));
    for (const key of ["owner", "other"] as AgentKey[]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({
          title: `Owned Scope Agent ${key} ${suffix}`,
          engagementStatus: AgentEngagementStatusType.ACTIVE,
        }),
      );
    }

    const opportunityAgents: Record<OpportunityKey, AgentKey> = {
      own: "owner",
      suggested: "other",
      unrelated: "other",
    };
    for (const key of Object.keys(opportunityAgents) as OpportunityKey[]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Owned Scope ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.ACTIVE,
          agentId: agents[opportunityAgents[key]].id,
          dealId: deal.id,
          districtId,
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    const owners: Record<Caller, number | null> = {
      owned: agents.owner.id,
      platform: null,
    };
    for (const caller of Object.keys(owners) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Scoped", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      deals.push(deal);
      volunteers[caller] = await fastify.db.volunteerRepository.save(
        new Volunteer({
          dealId: deal.id,
          personId: person.id,
          ownerAgentId: owners[caller],
        }),
      );
      const email = `owned-scope-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: UserRole.VOLUNTEER,
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }

    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunities.suggested.id,
        volunteerId: volunteers.owned.id,
        status: OpportunityVolunteerStatusType.PAST,
      }),
    );
  });

  afterAll(async () => {
    const opportunityIds = Object.values(opportunities).map(({ id }) => id);
    for (const id of opportunityIds) {
      await fastify.db.opportunityVolunteerRepository.delete({
        opportunityId: id,
      });
      await fastify.db.opportunityRepository.delete({ id });
    }
    for (const volunteer of Object.values(volunteers)) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    for (const agent of Object.values(agents)) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify.close();
  });

  describe.each([
    ["GET /opportunity", opportunityListUrl],
    ["GET /volunteer/opportunity", volunteerOpportunityListUrl],
  ])("%s", (_route, url) => {
    it("lists only the owning NGO's and the suggested opportunities", async () => {
      expect(await listedIds(url(), "owned")).toEqual(
        idsOf("own", "suggested"),
      );
    });

    it("keeps listing everything for a platform volunteer", async () => {
      expect(await listedIds(url(), "platform")).toEqual(allIds());
    });
  });

  describe("owning NGO's name", () => {
    const agentTitleOf = async (as: Caller) => {
      const res = await get(`/opportunity/${opportunities.own.id}`, as);
      expect(res.statusCode).toBe(200);
      return res.json().data.agentTitle;
    };

    it("is visible to the NGO's owned volunteer", async () => {
      expect(await agentTitleOf("owned")).toBe(agents.owner.title);
    });

    it("stays masked for an unmatched platform volunteer", async () => {
      expect(await agentTitleOf("platform")).toMatch(/^[a-z]\*{3}$/);
    });
  });

  describe("GET /opportunity/:id", () => {
    it("shows the owning NGO's and the suggested opportunity", async () => {
      for (const key of ["own", "suggested"] as OpportunityKey[]) {
        const res = await get(`/opportunity/${opportunities[key].id}`, "owned");
        expect(res.statusCode).toBe(200);
      }
    });

    it("answers 404 for an unrelated opportunity", async () => {
      const res = await get(
        `/opportunity/${opportunities.unrelated.id}`,
        "owned",
      );
      expect(res.statusCode).toBe(404);
    });

    it("keeps showing an unrelated opportunity to a platform volunteer", async () => {
      const res = await get(
        `/opportunity/${opportunities.unrelated.id}`,
        "platform",
      );
      expect(res.statusCode).toBe(200);
    });
  });

  it("never lists an opportunity's linked volunteers to an owned volunteer", async () => {
    const linked = (key: OpportunityKey) =>
      get(`/opportunity/${opportunities[key].id}/volunteer-linked`, "owned");
    expect((await linked("own")).statusCode).toBe(403);
    expect((await linked("suggested")).statusCode).toBe(403);
    expect((await linked("unrelated")).statusCode).toBe(403);
  });

  it("counts only visible opportunities in the district aggregate", async () => {
    const res = await get("/opportunity/districts?language=de", "owned");
    expect(res.statusCode).toBe(200);
    const { districts, unassignedBerlin, outsideBerlin, remote } =
      res.json().data;
    const total =
      (districts as { count: number }[]).reduce(
        (sum, { count }) => sum + count,
        0,
      ) +
      unassignedBerlin +
      outsideBerlin +
      remote;
    expect(total).toBe(2);
  });

  it("counts only visible opportunities on the district map", async () => {
    const res = await get(
      `/opportunity/map?districtId=${districtId}&language=de`,
      "owned",
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().data.total).toBe(2);
  });
});
