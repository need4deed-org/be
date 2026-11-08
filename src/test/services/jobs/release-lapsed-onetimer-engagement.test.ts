import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
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

// A far-future "today" keeps the sweep away from other test files' rows.
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

  const volunteerWithPastOnetimer = async (
    days: number,
    engagement: VolunteerStateEngagementType = ACTIVE,
    type: OpportunityType = OpportunityType.ACCOMPANYING,
  ) => {
    const volunteer = await ctx.fixtures.volunteer(engagement);
    await ctx.fixtures.onetimer(ctx.agent, {
      date: daysAgo(days),
      type,
      status: OpportunityStatusType.PAST,
      matches: [{ volunteer, status: PAST }],
    });
    return volunteer;
  };

  it.each([OpportunityType.ACCOMPANYING, OpportunityType.EVENTS])(
    "keeps a volunteer Active on day 28 after an %s",
    async (type) => {
      const volunteer = await volunteerWithPastOnetimer(28, ACTIVE, type);

      await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

      expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
      expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(0);
    },
  );

  it.each([OpportunityType.ACCOMPANYING, OpportunityType.EVENTS])(
    "makes a volunteer Available on day 29 after an %s and logs it",
    async (type) => {
      const volunteer = await volunteerWithPastOnetimer(29, ACTIVE, type);

      await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

      expect(await ctx.fixtures.engagement(volunteer)).toBe(AVAILABLE);
      const logs = await ctx.fixtures.engagementLogs(volunteer);
      expect(logs).toHaveLength(1);
      expect(logs[0].detail).toBe(
        `Status changed from ${ACTIVE} to ${AVAILABLE}.`,
      );
      expect(ctx.loggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("released"),
      );
    },
  );

  it("keeps a volunteer Active while another match is Active", async () => {
    const volunteer = await volunteerWithPastOnetimer(29);
    await ctx.fixtures.onetimer(ctx.agent, {
      date: daysAgo(60),
      type: OpportunityType.REGULAR,
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.ACTIVE }],
    });

    await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("keeps a volunteer Active while a newer accompanying or event holds it", async () => {
    const volunteer = await volunteerWithPastOnetimer(29);
    await ctx.fixtures.onetimer(ctx.agent, {
      date: daysAgo(3),
      type: OpportunityType.EVENTS,
      status: OpportunityStatusType.PAST,
      matches: [{ volunteer, status: PAST }],
    });

    await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("never touches a status a coordinator set by hand", async () => {
    const volunteer = await volunteerWithPastOnetimer(29, TEMP_UNAVAILABLE);

    await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(TEMP_UNAVAILABLE);
    expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(0);
  });

  it("leaves an Active volunteer alone once the hold lapsed more than a week ago", async () => {
    const volunteer = await volunteerWithPastOnetimer(36);

    await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });

  it("ignores a past regular match", async () => {
    const volunteer = await volunteerWithPastOnetimer(
      29,
      ACTIVE,
      OpportunityType.REGULAR,
    );

    await releaseLapsedOnetimerEngagement(ctx.fastify, TODAY);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(ACTIVE);
  });
});
