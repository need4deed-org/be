import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { addDays } from "../../../services/jobs/berlin-dates";
import { releaseLapsedOnetimerEngagement } from "../../../services/jobs/release-lapsed-onetimer-engagement";
import { randomNumericSuffix } from "../../random";
import { setupOnetimerJobTest } from "./onetimer-fixtures";

vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (await import("./onetimer-query-scope")).scopeOnetimerQuery(
      await importOriginal(),
    ),
);

const scope = { volunteerIds: [] as number[] };

vi.mock(
  "../../../server/utils/data/build-lapsed-hold-query",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("../../../server/utils/data/build-lapsed-hold-query")
      >();
    return {
      ...original,
      buildLapsedHoldQuery: (
        ...args: Parameters<typeof original.buildLapsedHoldQuery>
      ) =>
        original
          .buildLapsedHoldQuery(...args)
          .andWhere("volunteer.id IN (:...scopedVolunteerIds)", {
            scopedVolunteerIds: scope.volunteerIds.length
              ? scope.volunteerIds
              : [0],
          }),
    };
  },
);

const TODAY = new Date(2101, 2, 15);
const daysAgo = (days: number) => {
  const date = addDays(TODAY, -days);
  date.setHours(12);
  return date;
};

describe("releaseLapsedOnetimerEngagement", () => {
  const ctx = setupOnetimerJobTest();
  const { ACTIVE, AVAILABLE, TEMP_UNAVAILABLE } = VolunteerStateEngagementType;
  const { PAST } = OpportunityVolunteerStatusType;
  let actorUserId: number;

  let actor: User;

  beforeAll(async () => {
    const person = await ctx.fastify.db.personRepository.save(
      new Person({ firstName: "Lapsed", lastName: "Coordinator" }),
    );
    actor = await ctx.fastify.db.userRepository.save(
      new User({
        email: `lapsed-${randomNumericSuffix()}@test.need4deed.org`,
        password: "unused",
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    actorUserId = actor.id;
  });

  afterAll(async () => {
    if (actor) {
      await ctx.fastify.db.userRepository.delete(actor.id);
      await ctx.fastify.db.personRepository.delete(actor.personId);
    }
  });

  const logStatus = (
    volunteer: Volunteer,
    from: VolunteerStateEngagementType,
    to: VolunteerStateEngagementType,
    byHand = false,
  ) =>
    ctx.fastify.db.volunteerAuditLogRepository.save({
      volunteerId: volunteer.id,
      type: "availability_changed",
      detail: `Status changed from ${from} to ${to}.`,
      occurredAt: new Date(),
      actorUserId: byHand ? actorUserId : undefined,
    });

  const systemActiveVolunteer = async () => {
    const volunteer = await ctx.fixtures.volunteer(ACTIVE);
    await logStatus(volunteer, AVAILABLE, ACTIVE);
    return volunteer;
  };

  const backdateLogs = (volunteer: Volunteer, days: number) =>
    ctx.fastify.db.volunteerAuditLogRepository.update(
      { volunteerId: volunteer.id },
      { occurredAt: daysAgo(days) },
    );

  const addPastOnetimer = (
    volunteer: Volunteer,
    days: number,
    type: OpportunityType = OpportunityType.ACCOMPANYING,
  ) =>
    ctx.fixtures.onetimer(ctx.agent, {
      date: daysAgo(days),
      type,
      status: OpportunityStatusType.PAST,
      matches: [{ volunteer, status: PAST }],
    });

  const run = (...volunteers: Volunteer[]) => {
    scope.volunteerIds = volunteers.map(({ id }) => id);
    return releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);
  };

  it.each([OpportunityType.ACCOMPANYING, OpportunityType.EVENTS])(
    "keeps a volunteer Active on day 28 after an %s",
    async (type) => {
      const volunteer = await systemActiveVolunteer();
      await addPastOnetimer(volunteer, 28, type);

      await run(volunteer);

      expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
      expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(1);
    },
  );

  it.each([OpportunityType.ACCOMPANYING, OpportunityType.EVENTS])(
    "makes a volunteer Available on day 29 after an %s and logs it",
    async (type) => {
      const volunteer = await systemActiveVolunteer();
      await addPastOnetimer(volunteer, 29, type);

      await run(volunteer);

      expect(await ctx.fixtures.engagement(volunteer)).toBe(AVAILABLE);
      const logs = await ctx.fixtures.engagementLogs(volunteer);
      expect(logs.map(({ detail }) => detail)).toContain(
        `Status changed from ${ACTIVE} to ${AVAILABLE}.`,
      );
      expect(logs).toHaveLength(2);
      expect(ctx.loggerInfo).toHaveBeenCalledWith(
        { volunteerIds: [volunteer.id] },
        expect.stringContaining("released 1 volunteer(s)"),
      );
    },
  );

  it("releases a volunteer whose hold lapsed long ago, after missed runs", async () => {
    const volunteer = await systemActiveVolunteer();
    await addPastOnetimer(volunteer, 60);

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(AVAILABLE);
  });

  it("leaves an Active volunteer without any accompanying or event alone", async () => {
    const volunteer = await systemActiveVolunteer();

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("keeps a volunteer Active while another match is Active", async () => {
    const volunteer = await systemActiveVolunteer();
    await addPastOnetimer(volunteer, 29);
    await ctx.fixtures.onetimer(ctx.agent, {
      date: daysAgo(60),
      type: OpportunityType.REGULAR,
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.ACTIVE }],
    });

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("keeps a volunteer Active while a newer accompanying or event holds it", async () => {
    const volunteer = await systemActiveVolunteer();
    await addPastOnetimer(volunteer, 29);
    await addPastOnetimer(volunteer, 3, OpportunityType.EVENTS);

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("never touches a status a coordinator set by hand", async () => {
    const unavailable = await ctx.fixtures.volunteer(TEMP_UNAVAILABLE);
    await addPastOnetimer(unavailable, 29);

    await run(unavailable);

    expect(await ctx.fixtures.engagement(unavailable)).toBe(TEMP_UNAVAILABLE);
    expect(await ctx.fixtures.engagementLogs(unavailable)).toHaveLength(0);
  });

  it("keeps an Active a coordinator set by hand after the accompanying", async () => {
    const volunteer = await ctx.fixtures.volunteer(ACTIVE);
    await addPastOnetimer(volunteer, 40);
    await logStatus(volunteer, AVAILABLE, ACTIVE, true);
    await backdateLogs(volunteer, 10);

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("counts a hand-set Active earlier on the day of the accompanying as after it", async () => {
    const volunteer = await ctx.fixtures.volunteer(ACTIVE);
    await addPastOnetimer(volunteer, 40);
    await logStatus(volunteer, AVAILABLE, ACTIVE, true);
    const morning = daysAgo(40);
    morning.setHours(8);
    await ctx.fastify.db.volunteerAuditLogRepository.update(
      { volunteerId: volunteer.id },
      { occurredAt: morning },
    );

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it.each([
    ["set Active by hand before the accompanying", true],
    ["with no status history", false],
  ])("releases a volunteer %s", async (_label, byHand) => {
    const volunteer = await ctx.fixtures.volunteer(ACTIVE);
    if (byHand) {
      await logStatus(volunteer, AVAILABLE, ACTIVE, true);
      await backdateLogs(volunteer, 90);
    }
    await addPastOnetimer(volunteer, 29);

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(AVAILABLE);
  });

  it("leaves a volunteer alone whose last accompanying or event predates the rule", async () => {
    const volunteer = await systemActiveVolunteer();
    await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date("2026-09-01T12:00:00+02:00"),
      status: OpportunityStatusType.PAST,
      matches: [{ volunteer, status: PAST }],
    });

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });
});
