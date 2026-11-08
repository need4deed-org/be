import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { findVolunteerIdsActiveFromOnetimer } from "../../../server/utils/data/onetimer-active-period";
import { randomNumericSuffix } from "../../random";
import { OnetimerFixtures } from "../../services/jobs/onetimer-fixtures";
import { DAY } from "../../time";

describe("activeFromOnetimer on the volunteer list and detail", () => {
  let fastify: FastifyInstance;
  let fixtures: OnetimerFixtures;
  let agent: Agent;
  let admin: User;
  let adminPerson: Person;
  let cookie: string;
  const { ACTIVE, AVAILABLE } = VolunteerStateEngagementType;
  const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    fixtures = new OnetimerFixtures(fastify);
    agent = await fixtures.agent();
    const suffix = randomNumericSuffix();
    adminPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Admin", lastName: `Onetimer ${suffix}` }),
    );
    admin = await fastify.db.userRepository.save(
      new User({
        email: `admin-onetimer-${suffix}@test.need4deed.org`,
        password: await hashPassword("test_password"),
        role: UserRole.ADMIN,
        isActive: true,
        personId: adminPerson.id,
      }),
    );
    cookie = fastify.jwt.sign({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "access",
    });
  });

  afterAll(async () => {
    try {
      await fixtures?.cleanup();
      if (admin) {
        await fastify.db.userRepository.delete(admin.id);
      }
      if (adminPerson) {
        await fastify.db.personRepository.delete(adminPerson.id);
      }
    } finally {
      await fastify?.close();
    }
  });

  const withMatch = async (
    volunteer: Volunteer,
    {
      days,
      status,
      type = OpportunityType.ACCOMPANYING,
    }: {
      days: number;
      status: OpportunityVolunteerStatusType;
      type?: OpportunityType;
    },
  ) => {
    await fixtures.onetimer(agent, {
      date: daysAgo(days),
      type,
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status }],
    });
    return volunteer;
  };

  const flagged = async (volunteer: Volunteer) =>
    (
      await findVolunteerIdsActiveFromOnetimer(
        fastify.db.volunteerRepository.manager,
        [volunteer.id],
      )
    ).has(volunteer.id);

  it("is true for an Active volunteer held by a recent accompanying", async () => {
    const volunteer = await withMatch(await fixtures.volunteer(ACTIVE), {
      days: 10,
      status: OpportunityVolunteerStatusType.PAST,
    });
    expect(await flagged(volunteer)).toBe(true);
  });

  it("is true for an Active volunteer whose only Active match is an event", async () => {
    const volunteer = await withMatch(await fixtures.volunteer(ACTIVE), {
      days: 0,
      status: OpportunityVolunteerStatusType.ACTIVE,
      type: OpportunityType.EVENTS,
    });
    expect(await flagged(volunteer)).toBe(true);
  });

  it("is false when an Active regular match keeps the volunteer Active", async () => {
    const volunteer = await withMatch(await fixtures.volunteer(ACTIVE), {
      days: 10,
      status: OpportunityVolunteerStatusType.PAST,
    });
    await withMatch(volunteer, {
      days: 60,
      status: OpportunityVolunteerStatusType.ACTIVE,
      type: OpportunityType.REGULAR,
    });
    expect(await flagged(volunteer)).toBe(false);
  });

  it("is false once the accompanying is more than 28 days ago", async () => {
    const volunteer = await withMatch(await fixtures.volunteer(ACTIVE), {
      days: 40,
      status: OpportunityVolunteerStatusType.PAST,
    });
    expect(await flagged(volunteer)).toBe(false);
  });

  it("is false when the volunteer isn't Active", async () => {
    const volunteer = await withMatch(await fixtures.volunteer(AVAILABLE), {
      days: 10,
      status: OpportunityVolunteerStatusType.PAST,
    });
    expect(await flagged(volunteer)).toBe(false);
  });

  it("is returned on GET /volunteer and GET /volunteer/:id", async () => {
    const lastName = `Onetimer${randomNumericSuffix()}`;
    const held = await withMatch(await fixtures.volunteer(ACTIVE), {
      days: 10,
      status: OpportunityVolunteerStatusType.PAST,
    });
    const plain = await fixtures.volunteer(ACTIVE);
    await fastify.db.personRepository.update([held.personId, plain.personId], {
      lastName,
    });

    const list = await fastify.inject({
      method: "GET",
      url: `/volunteer?filter[search]=${encodeURIComponent(lastName)}`,
      cookies: { [accessCookieName]: cookie },
    });
    expect(list.statusCode).toBe(200);
    const byId = Object.fromEntries(
      (list.json().data as { id: number; activeFromOnetimer: boolean }[]).map(
        (v) => [v.id, v.activeFromOnetimer],
      ),
    );
    expect(byId).toEqual({ [held.id]: true, [plain.id]: false });

    const detail = await fastify.inject({
      method: "GET",
      url: `/volunteer/${held.id}`,
      cookies: { [accessCookieName]: cookie },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.activeFromOnetimer).toBe(true);
  });
});
