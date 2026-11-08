import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { addDays } from "../../../services/jobs/berlin-dates";
import { releaseLapsedOnetimerEngagement } from "../../../services/jobs/release-lapsed-onetimer-engagement";
import { setupOnetimerJobTest } from "./onetimer-fixtures";

vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (await import("./onetimer-query-scope")).scopeOnetimerQuery(
      await importOriginal(),
    ),
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

  beforeAll(async () => {
    actorUserId = (
      await ctx.fastify.db.userRepository.findOneOrFail({
        where: {},
      })
    ).id;
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

  const run = (...volunteers: Volunteer[]) =>
    releaseLapsedOnetimerEngagement(
      ctx.fastify,
      TODAY,
      volunteers.map(({ id }) => id),
    );

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
        expect.stringContaining("released 1 volunteer(s)"),
      );
    },
  );

  it("releases a volunteer whose hold lapsed long ago or whose match is gone", async () => {
    const lapsedLongAgo = await systemActiveVolunteer();
    await addPastOnetimer(lapsedLongAgo, 60);
    const matchGone = await systemActiveVolunteer();

    await run(lapsedLongAgo, matchGone);

    expect(await ctx.fixtures.engagement(lapsedLongAgo)).toBe(AVAILABLE);
    expect(await ctx.fixtures.engagement(matchGone)).toBe(AVAILABLE);
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
    const activeByHand = await systemActiveVolunteer();
    await addPastOnetimer(activeByHand, 29);
    await logStatus(activeByHand, AVAILABLE, ACTIVE, true);

    await run(unavailable, activeByHand);

    expect(await ctx.fixtures.engagement(unavailable)).toBe(TEMP_UNAVAILABLE);
    expect(await ctx.fixtures.engagement(activeByHand)).toBe(ACTIVE);
  });

  it("leaves an Active volunteer with no status history alone", async () => {
    const volunteer = await ctx.fixtures.volunteer(ACTIVE);
    await addPastOnetimer(volunteer, 29);

    await run(volunteer);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
    expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(0);
  });
});
