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
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type Caller = "coordinator" | "agent" | "volunteer";

describe("GET /opportunity volunteerNames", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  let agent: Agent;
  let opportunity: Opportunity;
  const deals: Deal[] = [];
  const persons: Person[] = [];
  const volunteers: Volunteer[] = [];
  const cookies = {} as Record<Caller, string>;

  const volunteerNamesFor = async (as: Caller) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/opportunity?limit=100&filter[search]=${suffix}`,
      cookies: { [accessCookieName]: cookies[as] },
    });
    expect(res.statusCode).toBe(200);
    const row = (
      res.json().data as { id: number; volunteerNames?: string[] }[]
    ).find(({ id }) => id === opportunity.id);
    expect(row).toBeDefined();
    return row!.volunteerNames;
  };

  const savePerson = async (lastName: string) => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Names", lastName: `${lastName}${suffix}` }),
    );
    persons.push(person);
    return person;
  };

  const saveVolunteer = async (person: Person, postcodeId: number) => {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId }),
    );
    deals.push(deal);
    const volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: person.id }),
    );
    volunteers.push(volunteer);
    return volunteer;
  };

  const login = async (caller: Caller, role: UserRole, person: Person) => {
    const email = `names-${caller}-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
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
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const district = await fastify.db.districtRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Names Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    const opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    deals.push(opportunityDeal);
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Names Opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: opportunityDeal.id,
        districtId: district.id,
      }),
    );

    const matched = await saveVolunteer(
      await savePerson("Matched"),
      postcode.id,
    );
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: matched.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );

    const volunteerPerson = await savePerson("Caller");
    await saveVolunteer(volunteerPerson, postcode.id);
    await login("volunteer", UserRole.VOLUNTEER, volunteerPerson);

    await login(
      "coordinator",
      UserRole.COORDINATOR,
      await savePerson("Coordinator"),
    );

    const agentPerson = await savePerson("Agent");
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: agentPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );
    await login("agent", UserRole.AGENT, agentPerson);
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      opportunityId: opportunity.id,
    });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    for (const volunteer of volunteers) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("names the matched volunteers for a coordinator", async () => {
    expect(await volunteerNamesFor("coordinator")).toEqual([
      `Names Matched${suffix}`,
    ]);
  });

  it("names the matched volunteers for the owning NGO", async () => {
    expect(await volunteerNamesFor("agent")).toEqual([
      `Names Matched${suffix}`,
    ]);
  });

  it("gives a volunteer no entries, not even masked ones", async () => {
    expect(await volunteerNamesFor("volunteer")).toEqual([]);
  });
});
