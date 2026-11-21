import { FastifyInstance } from "fastify";
import {
  ApiMyActivityItem,
  EntityTableName,
  MyActivityKind,
  OpportunityType,
  UserRole,
  VolunteerAuditLogType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import VolunteerAuditLog from "../../../data/entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

describe("GET /user/me/activity", () => {
  let fastify: FastifyInstance;
  let coordinator: User;
  let coordinatorCookie: string;
  let otherCoordinator: User;
  let volunteerCookie: string;
  let volunteer: Volunteer;
  let opportunity: Opportunity;
  let agent: Agent;
  let deal: Deal;
  const suffix = randomNumericSuffix();
  const created = { users: [] as number[], persons: [] as number[] };

  async function createLogin(role: UserRole) {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Activity", lastName: `${role}-${suffix}` }),
    );
    created.persons.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email: `my-activity-${role}-${randomNumericSuffix()}@test.need4deed.org`,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    created.users.push(user.id);
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: user.email, password: PASSWORD },
    });
    const cookie = response.cookies.find(
      ({ name }) => name === accessCookieName,
    );
    if (!cookie) {
      throw new Error("login failed");
    }
    return { user, cookie: cookie.value };
  }

  async function addComment(
    user: User,
    entityType: EntityTableName,
    entityId: number,
    text: string,
    createdAt: string,
  ) {
    const language = await fastify.db.languageRepository.findOneByOrFail({
      isoCode: "en",
    });
    await dataSource.getRepository(Comment).save(
      new Comment({
        text,
        entityType,
        entityId,
        languageId: language.id,
        userId: user.id,
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
      }),
    );
  }

  async function getActivity(
    cookie = coordinatorCookie,
    query = "",
  ): Promise<ApiMyActivityItem[]> {
    const response = await fastify.inject({
      method: "GET",
      url: `/user/me/activity${query}`,
      cookies: { [accessCookieName]: cookie },
    });
    expect(response.statusCode, response.body).toBe(200);
    return response.json().data;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    ({ user: coordinator, cookie: coordinatorCookie } = await createLogin(
      UserRole.COORDINATOR,
    ));
    ({ user: otherCoordinator } = await createLogin(UserRole.COORDINATOR));
    ({ cookie: volunteerCookie } = await createLogin(UserRole.VOLUNTEER));

    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({
        firstName: "Mira",
        middleName: "Lea",
        lastName: `Feed-${suffix}`,
      }),
    );
    created.persons.push(volunteerPerson.id);
    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Feed opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
      }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Feed NGO ${suffix}` }),
    );

    await addComment(
      coordinator,
      EntityTableName.OPPORTUNITY,
      opportunity.id,
      "Called the NGO",
      "2026-11-17T10:00:00Z",
    );
    await addComment(
      coordinator,
      EntityTableName.AGENT,
      agent.id,
      "New contact person",
      "2026-11-18T10:00:00Z",
    );
    await addComment(
      otherCoordinator,
      EntityTableName.VOLUNTEER,
      volunteer.id,
      "Not mine",
      "2026-11-19T09:00:00Z",
    );
    await dataSource.getRepository(VolunteerAuditLog).save(
      new VolunteerAuditLog({
        volunteerId: volunteer.id,
        type: VolunteerAuditLogType.AVAILABILITY_CHANGED,
        detail: "Availability changed.",
        actorUserId: coordinator.id,
        occurredAt: new Date("2026-11-19T08:00:00Z"),
      }),
    );
  });

  afterAll(async () => {
    await dataSource.getRepository(Comment).delete({ userId: coordinator.id });
    await dataSource
      .getRepository(Comment)
      .delete({ userId: otherCoordinator.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.userRepository.delete(created.users);
    await fastify.db.personRepository.delete(created.persons);
    await fastify.close();
  });

  it("lists the caller's own comments and changes, newest first, with names", async () => {
    const activity = await getActivity();

    expect(
      activity.map(({ kind, entityType, entityTitle, text }) => ({
        kind,
        entityType,
        entityTitle,
        text,
      })),
    ).toEqual([
      {
        kind: MyActivityKind.CHANGE,
        entityType: EntityTableName.VOLUNTEER,
        entityTitle: `Mira Lea Feed-${suffix}`,
        text: "Availability changed.",
      },
      {
        kind: MyActivityKind.COMMENT,
        entityType: EntityTableName.AGENT,
        entityTitle: `Feed NGO ${suffix}`,
        text: "New contact person",
      },
      {
        kind: MyActivityKind.COMMENT,
        entityType: EntityTableName.OPPORTUNITY,
        entityTitle: `Feed opportunity ${suffix}`,
        text: "Called the NGO",
      },
    ]);
    expect(activity[0].changeType).toBe(
      VolunteerAuditLogType.AVAILABILITY_CHANGED,
    );
    expect(activity[1]).not.toHaveProperty("changeType");
  });

  it("honours the limit, keeping the newest", async () => {
    const activity = await getActivity(coordinatorCookie, "?limit=1");
    expect(activity).toHaveLength(1);
    expect(activity[0].kind).toBe(MyActivityKind.CHANGE);
  });

  it("leaves out comments on an NGO that was deleted", async () => {
    const goneAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Gone NGO ${suffix}` }),
    );
    await addComment(
      coordinator,
      EntityTableName.AGENT,
      goneAgent.id,
      "On a deleted NGO",
      "2026-11-20T09:00:00Z",
    );
    await fastify.db.agentRepository.delete({ id: goneAgent.id });

    const activity = await getActivity();

    expect(activity.map(({ text }) => text)).not.toContain("On a deleted NGO");
  });

  it("names the volunteer on the caller's own volunteer comment", async () => {
    await addComment(
      coordinator,
      EntityTableName.VOLUNTEER,
      volunteer.id,
      "Mine on a volunteer",
      "2026-11-21T09:00:00Z",
    );

    const [newest] = await getActivity();

    expect(newest).toMatchObject({
      kind: MyActivityKind.COMMENT,
      entityType: EntityTableName.VOLUNTEER,
      entityTitle: `Mira Lea Feed-${suffix}`,
      text: "Mine on a volunteer",
    });
  });

  it("is open to admins", async () => {
    const { cookie } = await createLogin(UserRole.ADMIN);
    expect(await getActivity(cookie)).toEqual([]);
  });

  it("is for staff only", async () => {
    const response = await fastify.inject({
      method: "GET",
      url: "/user/me/activity",
      cookies: { [accessCookieName]: volunteerCookie },
    });
    expect(response.statusCode).toBe(403);
  });
});
