import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";
const OWN_AGENT_OPPORTUNITY_COUNT = 3;
const OTHER_AGENT_OPPORTUNITY_COUNT = 2;

describe("GET /opportunity is scoped to an AGENT caller's own agent(s)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const prefix = `AgentScope ${suffix}`;
  const coordinatorEmail = `coordinator-${suffix}@test.need4deed.org`;
  const agentEmail = `agentrole-${suffix}@test.need4deed.org`;

  let coordinatorCookie: string;
  let agentCookie: string;
  let personId: number;

  let postcodeId: number;
  let districtId: number;
  let otherDistrictId: number;
  let ownAgentId: number;
  let otherAgentId: number;
  const agents: Agent[] = [];
  const deals: Deal[] = [];
  const opportunities: Opportunity[] = [];
  let volunteerPerson: Person;
  let volunteer: Volunteer;

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return res.cookies.find((cookie) => cookie.name === accessCookieName)!
      .value;
  }

  async function listOpportunities(cookie: string, query = "") {
    return fastify.inject({
      method: "GET",
      url: `/opportunity/?limit=120${query}`,
      cookies: { [accessCookieName]: cookie },
    });
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    ({ id: postcodeId } = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    }));
    const districts: { id: number }[] =
      await fastify.db.agentRepository.manager.query(
        `SELECT id FROM district ORDER BY id LIMIT 2`,
      );
    [districtId, otherDistrictId] = districts.map(({ id }) => id);

    for (const key of ["own", "other"]) {
      agents.push(
        await fastify.db.agentRepository.save(
          new Agent({
            title: `${prefix} agent ${key}`,
            engagementStatus: AgentEngagementStatusType.ACTIVE,
            districtId,
          }),
        ),
      );
    }
    [ownAgentId, otherAgentId] = agents.map((agent) => agent.id);

    const ownedCounts: [number, number][] = [
      [ownAgentId, OWN_AGENT_OPPORTUNITY_COUNT],
      [otherAgentId, OTHER_AGENT_OPPORTUNITY_COUNT],
    ];
    for (const [agentId, count] of ownedCounts) {
      for (let i = 0; i < count; i++) {
        const deal = await fastify.db.dealRepository.save(
          new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
        );
        deals.push(deal);
        opportunities.push(
          await fastify.db.opportunityRepository.save(
            new Opportunity({
              title: `${prefix} agent ${agentId} opp ${i}`,
              type: OpportunityType.REGULAR,
              agentId,
              dealId: deal.id,
              districtId,
            }),
          ),
        );
      }
    }

    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Scope", lastName: `Volunteer-${suffix}` }),
    );
    const volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId }),
    );
    deals.push(volunteerDeal);
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: volunteerPerson.id,
        dealId: volunteerDeal.id,
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
      }),
    );
    for (const agentId of [ownAgentId, otherAgentId]) {
      await fastify.db.opportunityVolunteerRepository.save(
        new OpportunityVolunteer({
          opportunityId: opportunities.find((o) => o.agentId === agentId)!.id,
          volunteerId: volunteer.id,
          status: OpportunityVolunteerStatusType.MATCHED,
        }),
      );
    }

    await fastify.db.userRepository.save(
      new User({
        email: coordinatorEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
    );
    coordinatorCookie = await login(coordinatorEmail);

    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Scope", lastName: `Test-${suffix}` }),
    );
    personId = person.id;

    await fastify.db.userRepository.save(
      new User({
        email: agentEmail,
        password: await hashPassword(PASSWORD),
        role: UserRole.AGENT,
        isActive: true,
        personId,
      }),
    );
    agentCookie = await login(agentEmail);

    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: ownAgentId,
        personId,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    if (volunteer) {
      await fastify.db.opportunityVolunteerRepository.delete({
        volunteerId: volunteer.id,
      });
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    if (volunteerPerson) {
      await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    }
    for (const opportunity of opportunities) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    if (personId) {
      await fastify.db.agentPersonRepository.delete({ personId });
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.db.userRepository.delete({ email: coordinatorEmail });
    for (const agent of agents) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify?.close();
  });

  it("returns only the caller's own agent's opportunities", async () => {
    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    const { data, count } = res.json();
    expect(count).toBe(OWN_AGENT_OPPORTUNITY_COUNT);
    expect(data.length).toBeGreaterThan(0);
    expect(
      data.every((o: { agentId: number }) => o.agentId === ownAgentId),
    ).toBe(true);
  });

  it("leaves a COORDINATOR seeing every agent's opportunities", async () => {
    const ownRows = `&filter[search]=${encodeURIComponent(prefix)}`;
    const coordinatorRes = await listOpportunities(coordinatorCookie, ownRows);
    const agentRes = await listOpportunities(agentCookie, ownRows);

    expect(coordinatorRes.statusCode).toBe(200);
    const coordinatorData = coordinatorRes.json().data;

    expect(
      coordinatorData.some(
        (o: { agentId: number }) => o.agentId === otherAgentId,
      ),
    ).toBe(true);
    expect(coordinatorData.length).toBeGreaterThan(agentRes.json().data.length);
  });

  it("scopes a district-filtered result to the caller's own agent", async () => {
    const dealRepository = fastify.db.dealRepository;
    const ownDeal = await dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    const otherDeal = await dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );

    const ownDistrictOpp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} own-agent district opp ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: ownAgentId,
        dealId: ownDeal.id,
        districtId,
      }),
    );
    const otherDistrictOpp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} other-agent district opp ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: otherAgentId,
        dealId: otherDeal.id,
        districtId,
      }),
    );

    try {
      const res = await listOpportunities(
        agentCookie,
        `&filter[district]=${districtId}`,
      );

      expect(res.statusCode).toBe(200);
      const { data } = res.json();
      expect(data.length).toBeGreaterThan(0);
      expect(
        data.every((o: { agentId: number }) => o.agentId === ownAgentId),
      ).toBe(true);
    } finally {
      await fastify.db.opportunityRepository.delete(ownDistrictOpp.id);
      await fastify.db.opportunityRepository.delete(otherDistrictOpp.id);
      await dealRepository.delete(ownDeal.id);
      await dealRepository.delete(otherDeal.id);
    }
  });

  it("also scopes a district match found only via deal.dealDistrict", async () => {
    const dealRepository = fastify.db.dealRepository;
    const dealDistrictRepository = getRepository(dataSource, DealDistrict);

    const ownDeal = await dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    const otherDeal = await dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    await dealDistrictRepository.save(
      new DealDistrict({ dealId: ownDeal.id, districtId: otherDistrictId }),
    );
    await dealDistrictRepository.save(
      new DealDistrict({ dealId: otherDeal.id, districtId: otherDistrictId }),
    );

    const ownOpp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} own-agent dealDistrict-only opp ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: ownAgentId,
        dealId: ownDeal.id,
      }),
    );
    const otherOpp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} other-agent dealDistrict-only opp ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: otherAgentId,
        dealId: otherDeal.id,
      }),
    );

    try {
      const res = await listOpportunities(
        agentCookie,
        `&filter[district]=${otherDistrictId}`,
      );

      expect(res.statusCode).toBe(200);
      const { data } = res.json();
      expect(data.some((o: { id: number }) => o.id === ownOpp.id)).toBe(true);
      expect(
        data.every((o: { agentId: number }) => o.agentId === ownAgentId),
      ).toBe(true);
    } finally {
      await fastify.db.opportunityRepository.delete(ownOpp.id);
      await fastify.db.opportunityRepository.delete(otherOpp.id);
      await dealDistrictRepository.delete({ dealId: ownDeal.id });
      await dealDistrictRepository.delete({ dealId: otherDeal.id });
      await dealRepository.delete(ownDeal.id);
      await dealRepository.delete(otherDeal.id);
    }
  });

  it("keeps a district-filtered, sortBy=start-date result scoped to the caller's own agent", async () => {
    const dealRepository = fastify.db.dealRepository;
    const ownDeal = await dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    const otherDeal = await dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );

    const ownOpp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} own-agent sortBy=start-date opp ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: ownAgentId,
        dealId: ownDeal.id,
        districtId,
      }),
    );
    const otherOpp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} other-agent sortBy=start-date opp ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: otherAgentId,
        dealId: otherDeal.id,
        districtId,
      }),
    );

    try {
      const res = await listOpportunities(
        agentCookie,
        `&filter[district]=${districtId}&sortBy=start-date`,
      );

      expect(res.statusCode).toBe(200);
      const { data } = res.json();
      expect(data.some((o: { id: number }) => o.id === ownOpp.id)).toBe(true);
      expect(
        data.every((o: { agentId: number }) => o.agentId === ownAgentId),
      ).toBe(true);
    } finally {
      await fastify.db.opportunityRepository.delete(ownOpp.id);
      await fastify.db.opportunityRepository.delete(otherOpp.id);
      await dealRepository.delete(ownDeal.id);
      await dealRepository.delete(otherDeal.id);
    }
  });

  it("keeps an AGENT scoped to their own agent even when filter[agentId] names another", async () => {
    const res = await listOpportunities(
      agentCookie,
      `&filter[agentId]=${otherAgentId}`,
    );

    expect(res.statusCode).toBe(200);
    const { data, count } = res.json();
    expect(count).toBe(OWN_AGENT_OPPORTUNITY_COUNT);
    expect(
      data.every((o: { agentId: number }) => o.agentId !== otherAgentId),
    ).toBe(true);
  });

  it("404s when an AGENT fetches another agent's linked volunteers", async () => {
    const link = await fastify.db.opportunityVolunteerRepository.findOne({
      where: { opportunity: { agentId: otherAgentId } },
      relations: ["opportunity"],
    });
    expect(link).toBeTruthy();

    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${link!.opportunityId}/volunteer-linked`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lets an AGENT fetch their own agent's linked volunteers", async () => {
    const link = await fastify.db.opportunityVolunteerRepository.findOne({
      where: { opportunity: { agentId: ownAgentId } },
      relations: ["opportunity"],
    });
    expect(link).toBeTruthy();

    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${link!.opportunityId}/volunteer-linked`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("404s when an AGENT fetches another agent's opportunity by id", async () => {
    const other = await fastify.db.opportunityRepository.findOneBy({
      agentId: otherAgentId,
    });
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${other!.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("lets an AGENT fetch their own agent's opportunity by id", async () => {
    const own = await fastify.db.opportunityRepository.findOneBy({
      agentId: ownAgentId,
    });
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity/${own!.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it("covers every agent a caller is a member of, not just the first", async () => {
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: otherAgentId,
        personId,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    const agentIds = new Set(
      res.json().data.map((o: { agentId: number }) => o.agentId),
    );
    expect(agentIds.has(ownAgentId)).toBe(true);
    expect(agentIds.has(otherAgentId)).toBe(true);
  });

  it("returns an empty list for an AGENT with no membership at all", async () => {
    await fastify.db.agentPersonRepository.delete({ personId });

    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });

  it("ignores a PENDING membership", async () => {
    await fastify.db.agentPersonRepository.delete({ personId });
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: ownAgentId,
        personId,
        role: AgentRoleType.SOCIAL_WORKER,
        status: AgentMembershipStatus.PENDING,
      }),
    );

    const res = await listOpportunities(agentCookie);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ data: [], count: 0 });
  });
});
