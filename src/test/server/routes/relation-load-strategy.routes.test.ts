import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  ProfileVolunteeringType,
  UserRole,
  VolunteerStateCommunicationType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import DealActivity from "../../../data/entity/m2m/deal-activity";
import DealDistrict from "../../../data/entity/m2m/deal-district";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Activity from "../../../data/entity/profile/activity.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { captureSql, maxToManyJoins } from "../../sql-capture";

const PASSWORD = "test_password";
describe("endpoints loading several to-many lists (be#1362)", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let opportunity: Opportunity;
  let volunteer: Volunteer;
  let activities: Activity[];
  let cookie: string;
  const cleanup: (() => Promise<unknown>)[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const db = fastify.db;
    const suffix = randomNumericSuffix();

    agent = await db.agentRepository.save(
      new Agent({ title: `Relation load agent ${suffix}` }),
    );
    const postcode = await db.postcodeRepository.findOneOrFail({ where: {} });
    const [opportunityDeal, volunteerDeal] = await db.dealRepository.save([
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    ]);

    activities = await getRepository(dataSource, Activity).save(
      [1, 2].map((n) => new Activity({ title: `Activity ${n} ${suffix}` })),
    );
    const districts = await db.districtRepository.find({ take: 2 });
    const [dealActivities, dealDistricts] = await Promise.all([
      getRepository(dataSource, DealActivity).save(
        activities.map(
          ({ id }) =>
            new DealActivity({ dealId: opportunityDeal.id, activityId: id }),
        ),
      ),
      getRepository(dataSource, DealDistrict).save(
        districts.map(
          ({ id }) =>
            new DealDistrict({ dealId: opportunityDeal.id, districtId: id }),
        ),
      ),
    ]);

    opportunity = await db.opportunityRepository.save(
      new Opportunity({
        title: `Relation load opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
        agentId: agent.id,
        dealId: opportunityDeal.id,
      }),
    );

    const person = await db.personRepository.save(
      new Person({ firstName: "Relation", lastName: `Volunteer ${suffix}` }),
    );
    volunteer = await db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: volunteerDeal.id,
        statusType: ProfileVolunteeringType.REGULAR,
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
        statusCommunication: VolunteerStateCommunicationType.CALLED,
      }),
    );
    const opportunityVolunteer = await db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );

    const coordinator = await db.personRepository.save(
      new Person({ firstName: "Relation", lastName: `Coordinator ${suffix}` }),
    );
    const email = `relation-load-${suffix}@test.need4deed.org`;
    await db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinator.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    const value = login.cookies.find((c) => c.name === accessCookieName)?.value;
    if (!value) {
      throw new Error("coordinator login returned no access cookie");
    }
    cookie = value;
    cleanup.push(
      () => db.userRepository.delete({ personId: coordinator.id }),
      () => db.personRepository.delete({ id: coordinator.id }),
      () => db.opportunityVolunteerRepository.delete(opportunityVolunteer.id),
      () => db.volunteerRepository.delete(volunteer.id),
      () => db.personRepository.delete(person.id),
      () => db.opportunityRepository.delete(opportunity.id),
      () =>
        getRepository(dataSource, DealActivity).delete(
          dealActivities.map(({ id }) => id),
        ),
      () =>
        getRepository(dataSource, DealDistrict).delete(
          dealDistricts.map(({ id }) => id),
        ),
      () =>
        getRepository(dataSource, Activity).delete(
          activities.map(({ id }) => id),
        ),
      () => db.dealRepository.delete([opportunityDeal.id, volunteerDeal.id]),
      () => db.agentRepository.delete(agent.id),
    );
  });

  afterAll(async () => {
    for (const step of cleanup) {
      await step();
    }
    await fastify?.close();
  });

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  const listUrl = () =>
    `/volunteer/opportunity?type=regular&status=${OpportunityStatusType.SEARCHING}&agentId=${agent.id}`;

  it.each([
    [
      "GET /agent/:id/volunteer-linked",
      () => `/agent/${agent.id}/volunteer-linked`,
    ],
    [
      "GET /opportunity/:id/volunteer-linked",
      () => `/opportunity/${opportunity.id}/volunteer-linked`,
    ],
    [
      "GET /agent/:id/opportunity-linked",
      () => `/agent/${agent.id}/opportunity-linked`,
    ],
    ["GET /opportunity/:id", () => `/opportunity/${opportunity.id}`],
    ["GET /volunteer/:id", () => `/volunteer/${volunteer.id}`],
    ["GET /volunteer/opportunity", listUrl],
    ["GET /opportunity/legacy", () => "/opportunity/legacy"],
  ])("%s joins at most one to-many list per query", async (_, url) => {
    let status = 0;
    const queries = await captureSql(async () => {
      status = (await get(url())).statusCode;
    });

    expect(status).toBe(200);
    expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
  });
});
