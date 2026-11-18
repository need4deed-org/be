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
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

describe("endpoints loading several to-many lists", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let opportunity: Opportunity;
  let volunteer: Volunteer;
  let opportunityVolunteer: OpportunityVolunteer;
  let linkedOpportunity: Opportunity;
  let taggedPersonIds: number[];
  let postId: number;
  let suffix: string;
  let cookie: string;
  const cleanup: (() => Promise<unknown>)[] = [];

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const db = fastify.db;
    suffix = randomNumericSuffix();

    agent = await db.agentRepository.save(
      new Agent({ title: `Relation load agent ${suffix}` }),
    );
    cleanup.push(() => db.agentRepository.delete(agent.id));
    const postcode = await db.postcodeRepository.findOneOrFail({
      where: {},
      order: { id: "ASC" },
    });
    const [opportunityDeal, volunteerDeal] = await db.dealRepository.save([
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    ]);
    cleanup.push(() =>
      db.dealRepository.delete([opportunityDeal.id, volunteerDeal.id]),
    );

    const activities = await getRepository(dataSource, Activity).save(
      [1, 2].map((n) => new Activity({ title: `Activity ${n} ${suffix}` })),
    );
    cleanup.push(() =>
      getRepository(dataSource, Activity).delete(
        activities.map(({ id }) => id),
      ),
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
    cleanup.push(
      () =>
        getRepository(dataSource, DealActivity).delete(
          dealActivities.map(({ id }) => id),
        ),
      () =>
        getRepository(dataSource, DealDistrict).delete(
          dealDistricts.map(({ id }) => id),
        ),
    );

    opportunity = await db.opportunityRepository.save(
      new Opportunity({
        title: `Relation load opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
        agentId: agent.id,
        dealId: opportunityDeal.id,
      }),
    );
    cleanup.push(() => db.opportunityRepository.delete(opportunity.id));
    linkedOpportunity = await db.opportunityRepository.save(
      new Opportunity({
        title: `Relation load linked opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        agentId: agent.id,
      }),
    );
    cleanup.push(() => db.opportunityRepository.delete(linkedOpportunity.id));

    const person = await db.personRepository.save(
      new Person({ firstName: "Relation", lastName: `Volunteer ${suffix}` }),
    );
    cleanup.push(() => db.personRepository.delete(person.id));
    volunteer = await db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: volunteerDeal.id,
        statusType: ProfileVolunteeringType.REGULAR,
        statusEngagement: VolunteerStateEngagementType.ACTIVE,
        statusCommunication: VolunteerStateCommunicationType.CALLED,
      }),
    );
    cleanup.push(
      () => db.volunteerRepository.delete(volunteer.id),
      () => db.communicationRepository.delete({ volunteerId: volunteer.id }),
    );
    opportunityVolunteer = await db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );
    cleanup.push(() =>
      db.opportunityVolunteerRepository.delete(opportunityVolunteer.id),
    );

    const coordinator = await db.personRepository.save(
      new Person({ firstName: "Relation", lastName: `Coordinator ${suffix}` }),
    );
    cleanup.push(
      () => db.personRepository.delete({ id: coordinator.id }),
      () => db.userRepository.delete({ personId: coordinator.id }),
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

    taggedPersonIds = [person.id, coordinator.id];
    postId = (await createPost()).json().data.id;
  });

  afterAll(async () => {
    for (const step of cleanup.reverse()) {
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

  const createPost = async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/post",
      cookies: { [accessCookieName]: cookie },
      payload: {
        text: `Relation load post ${suffix}`,
        taggedPersonIds,
        linkedOpportunityIds: [opportunity.id, linkedOpportunity.id],
      },
    });
    const id = res.json().data?.id;
    if (id) {
      cleanup.push(() => fastify.db.postRepository.delete(id));
    }
    return res;
  };

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
    ["GET /post", () => "/post"],
    [
      "GET /post?search",
      () => `/post?search=${encodeURIComponent(`Volunteer ${suffix}`)}`,
    ],
  ])("%s joins at most one to-many list per query", async (_, url) => {
    let status = 0;
    const queries = await captureSql(async () => {
      status = (await get(url())).statusCode;
    });

    expect(status).toBe(200);
    expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
  });

  it.each([
    ["GET /volunteer/opportunity", listUrl],
    ["GET /opportunity/legacy", () => "/opportunity/legacy"],
  ])("%s pages in ascending id order", async (_, url) => {
    let res!: Awaited<ReturnType<typeof get>>;
    const queries = await captureSql(async () => {
      res = await get(url());
    });

    expect(res.statusCode).toBe(200);
    const paged = queries.filter(
      (q) => /\bLIMIT\b/.test(q) && /FROM (?:"[^"]+"\.)?"opportunity"/.test(q),
    );
    expect(paged.length).toBeGreaterThan(0);
    for (const q of paged) {
      expect(q).toMatch(/ORDER BY .*"(?:\w+_)?id" ASC/);
    }
    const body = res.json();
    const ids: number[] = (Array.isArray(body) ? body : body.data).map(
      ({ id }: { id: number }) => id,
    );
    expect(ids).toContain(opportunity.id);
    expect(ids).toEqual([...ids].sort((x, y) => x - y));
  });

  it("PATCH /opportunity-volunteer/:id to matched joins at most one to-many list per query", async () => {
    const introduction = vi
      .spyOn(fastify.notify, "emailIntroduction")
      .mockResolvedValue(undefined);
    try {
      let status = 0;
      const queries = await captureSql(async () => {
        status = (
          await fastify.inject({
            method: "PATCH",
            url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
            payload: { status: OpportunityVolunteerStatusType.MATCHED },
            cookies: { [accessCookieName]: cookie },
          })
        ).statusCode;
        await vi.waitFor(() => expect(introduction).toHaveBeenCalledOnce());
      });

      expect(status).toBe(204);
      expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
    } finally {
      introduction.mockRestore();
    }
  });

  it("POST /post joins at most one to-many list per query", async () => {
    let status = 0;
    const queries = await captureSql(async () => {
      status = (await createPost()).statusCode;
    });

    expect(status).toBe(201);
    expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
  });

  it("PATCH /post/:id joins at most one to-many list per query", async () => {
    let status = 0;
    const queries = await captureSql(async () => {
      status = (
        await fastify.inject({
          method: "PATCH",
          url: `/post/${postId}`,
          cookies: { [accessCookieName]: cookie },
          payload: { text: `Relation load post ${suffix} edited` },
        })
      ).statusCode;
    });

    expect(status).toBe(200);
    expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
  });

  it("POST /opportunity-volunteer as pending joins at most one to-many list per query", async () => {
    const suggestion = vi
      .spyOn(fastify.notify, "emailSuggestion")
      .mockResolvedValue(undefined);
    cleanup.push(() =>
      fastify.db.opportunityVolunteerRepository.delete({
        opportunityId: linkedOpportunity.id,
      }),
    );
    try {
      let status = 0;
      const queries = await captureSql(async () => {
        status = (
          await fastify.inject({
            method: "POST",
            url: "/opportunity-volunteer",
            cookies: { [accessCookieName]: cookie },
            payload: {
              opportunityId: linkedOpportunity.id,
              volunteerId: volunteer.id,
              status: OpportunityVolunteerStatusType.PENDING,
            },
          })
        ).statusCode;
        await vi.waitFor(() => expect(suggestion).toHaveBeenCalledOnce());
      });

      expect(status).toBe(201);
      expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
    } finally {
      suggestion.mockRestore();
    }
  });
});
