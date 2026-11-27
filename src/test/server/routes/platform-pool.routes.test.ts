import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PLATFORM_AGENT_ID } from "../../../config";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

type Caller = "ngo" | "poolMember" | "coordinator";
type VolunteerKey = "noOwner" | "pool" | "otherNgo";
type OpportunityKey = "ngo" | "pool";

describe("need4deed pool as agent 106 (be#1468)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let ngo: Agent;
  let otherNgo: Agent;
  const volunteers = {} as Record<VolunteerKey, Volunteer>;
  const opportunities = {} as Record<OpportunityKey, Opportunity>;
  const persons: Person[] = [];
  const deals: Deal[] = [];
  const cookies = {} as Record<Caller, string>;

  const getVolunteer = (key: VolunteerKey, as: Caller) =>
    fastify.inject({
      method: "GET",
      url: `/volunteer/${volunteers[key].id}`,
      cookies: { [accessCookieName]: cookies[as] },
    });

  const listOwners = (ownerAgent: string) =>
    fastify.inject({
      method: "GET",
      url: `/volunteer?filter[ownerAgent]=${ownerAgent}&filter[search]=${suffix}&limit=50`,
      cookies: { [accessCookieName]: cookies.coordinator },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    vi.spyOn(fastify.notify, "emailSuggestionRequest").mockResolvedValue(
      undefined,
    );
    vi.spyOn(fastify.notify, "tagged").mockResolvedValue(undefined);

    await fastify.db.agentRepository.query(
      `INSERT INTO agent (id, title, engagement_status) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [PLATFORM_AGENT_ID, "Need4Deed", AgentEngagementStatusType.ACTIVE],
    );
    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    [ngo, otherNgo] = await fastify.db.agentRepository.save(
      ["ngo", "other"].map(
        (key) =>
          new Agent({
            title: `Pool Agent ${key} ${suffix}`,
            engagementStatus: AgentEngagementStatusType.ACTIVE,
            sharesVolunteers: false,
          }),
      ),
    );

    const pwHash = await hashPassword(PASSWORD);
    const memberships: Record<Caller, number | null> = {
      ngo: ngo.id,
      poolMember: PLATFORM_AGENT_ID,
      coordinator: null,
    };
    for (const [caller, agentId] of Object.entries(memberships) as [
      Caller,
      number | null,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Pool", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `pool-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: agentId ? UserRole.AGENT : UserRole.COORDINATOR,
          isActive: true,
          personId: person.id,
        }),
      );
      if (agentId) {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId,
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

    const owners: Record<VolunteerKey, number | null> = {
      noOwner: null,
      pool: PLATFORM_AGENT_ID,
      otherNgo: otherNgo.id,
    };
    for (const [key, ownerAgentId] of Object.entries(owners) as [
      VolunteerKey,
      number | null,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: `Vol${key}`, lastName: `Pool${suffix}` }),
      );
      persons.push(person);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      deals.push(deal);
      volunteers[key] = await fastify.db.volunteerRepository.save(
        new Volunteer({ dealId: deal.id, personId: person.id, ownerAgentId }),
      );
    }

    const opportunityAgents: Record<OpportunityKey, number> = {
      ngo: ngo.id,
      pool: PLATFORM_AGENT_ID,
    };
    for (const [key, agentId] of Object.entries(opportunityAgents) as [
      OpportunityKey,
      number,
    ][]) {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Pool Opportunity ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.ACTIVE,
          agentId,
          dealId: deal.id,
        }),
      );
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const volunteerIds = Object.values(volunteers).map(({ id }) => id);
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: In(volunteerIds),
    });
    await fastify.db.volunteerRepository.delete({ id: In(volunteerIds) });
    await fastify.db.opportunityRepository.delete({
      id: In(Object.values(opportunities).map(({ id }) => id)),
    });
    await fastify.db.dealRepository.delete({
      id: In(deals.map(({ id }) => id)),
    });
    const personIds = persons.map(({ id }) => id);
    await fastify.db.agentPersonRepository.delete({ personId: In(personIds) });
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    await fastify.db.agentRepository.delete({
      id: In([ngo.id, otherNgo.id]),
    });
    await fastify.close();
  });

  it("shows a pool volunteer to every NGO masked, like one without owner", async () => {
    for (const key of ["noOwner", "pool"] as VolunteerKey[]) {
      const res = await getVolunteer(key, "ngo");
      expect(res.statusCode).toBe(200);
      expect(res.json().data.person.firstName).toMatch(/^[a-z]\*\*\*$/);
    }
    expect((await getVolunteer("otherNgo", "ngo")).statusCode).toBe(404);
  });

  it("lists no owner and agent 106 together under either pool filter", async () => {
    for (const filter of ["none", String(PLATFORM_AGENT_ID)]) {
      const res = await listOwners(filter);
      expect(res.statusCode).toBe(200);
      const ids = res.json().data.map(({ id }: { id: number }) => id);
      expect(ids).toEqual(
        expect.arrayContaining([volunteers.noOwner.id, volunteers.pool.id]),
      );
      expect(ids).not.toContain(volunteers.otherNgo.id);
    }
  });

  it("keeps 'Vorschlag anfragen' for pool volunteers with the coordinators", async () => {
    for (const key of ["noOwner", "pool"] as VolunteerKey[]) {
      const res = await fastify.inject({
        method: "POST",
        url: `/volunteer/${volunteers[key].id}/suggestion-request`,
        cookies: { [accessCookieName]: cookies.ngo },
        payload: { opportunityId: opportunities.ngo.id },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain("ask need4deed");
    }
  });

  it("gives an NGO member of agent 106 no owner rights over the pool", async () => {
    const res = await getVolunteer("pool", "poolMember");
    expect(res.statusCode).toBe(200);
    expect(res.json().data.person.firstName).toMatch(/^[a-z]\*\*\*$/);

    const suggest = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: cookies.poolMember },
      payload: {
        opportunityId: opportunities.pool.id,
        volunteerId: volunteers.pool.id,
        status: OpportunityVolunteerStatusType.PENDING,
      },
    });
    expect(suggest.statusCode).toBe(404);
  });
});
