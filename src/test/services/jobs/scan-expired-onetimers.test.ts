import {
  addWorkingDays,
  berlinToday,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { scanExpiredOnetimers } from "../../../services/jobs/scan-expired-onetimers";
import { DAY, failSaveOf, setupOnetimerJobTest } from "./onetimer-fixtures";

vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (await import("./onetimer-query-scope")).scopeOnetimerQuery(
      await importOriginal(),
    ),
);

describe("scanExpiredOnetimers", () => {
  const ctx = setupOnetimerJobTest();
  const expired = () => new Date(Date.now() - 10 * DAY);

  it("does nothing when no opportunity has expired", async () => {
    await scanExpiredOnetimers(ctx.fastify);

    expect(ctx.loggerInfo).not.toHaveBeenCalled();
  });

  it.each([
    OpportunityVolunteerStatusType.MATCHED,
    OpportunityVolunteerStatusType.ACTIVE,
  ])(
    "marks an expired opportunity with a %s volunteer PAST, and that volunteer PAST",
    async (status) => {
      const volunteer = await ctx.fixtures.volunteer();
      const {
        opportunity,
        matches: [match],
      } = await ctx.fixtures.onetimer(ctx.agent, {
        date: expired(),
        status: OpportunityStatusType.ACTIVE,
        matches: [{ volunteer, status }],
      });

      await scanExpiredOnetimers(ctx.fastify);

      expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
        OpportunityStatusType.PAST,
      );
      expect(await ctx.fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.PAST,
      );
      expect(ctx.loggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("processed 1 expired opportunities"),
      );
    },
  );

  it("leaves other candidates of a PAST opportunity as they are", async () => {
    const matchedVolunteer = await ctx.fixtures.volunteer();
    const pendingVolunteer = await ctx.fixtures.volunteer();
    const {
      matches: [matched, pending],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      matches: [
        {
          volunteer: matchedVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
        {
          volunteer: pendingVolunteer,
          status: OpportunityVolunteerStatusType.PENDING,
        },
      ],
    });

    await scanExpiredOnetimers(ctx.fastify);

    expect(await ctx.fixtures.matchStatus(matched)).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(await ctx.fixtures.matchStatus(pending)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("marks an expired opportunity without a matched or active volunteer INACTIVE", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.PENDING }],
    });

    await scanExpiredOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.INACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("leaves an opportunity that has not expired yet alone", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await scanExpiredOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });

  it.each([
    { workingDaysAgo: 1, expected: OpportunityStatusType.SEARCHING },
    { workingDaysAgo: 2, expected: OpportunityStatusType.INACTIVE },
  ])(
    "counts an opportunity $workingDaysAgo working day(s) ago as $expected",
    async ({ workingDaysAgo, expected }) => {
      const date = addWorkingDays(berlinToday(), -workingDaysAgo);
      date.setHours(12);
      const { opportunity } = await ctx.fixtures.onetimer(ctx.agent, { date });

      await scanExpiredOnetimers(ctx.fastify);

      expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(expected);
    },
  );

  it.each([OpportunityStatusType.INACTIVE, OpportunityStatusType.PAST])(
    "skips an expired opportunity that is already %s",
    async (status) => {
      const volunteer = await ctx.fixtures.volunteer();
      const {
        opportunity,
        matches: [match],
      } = await ctx.fixtures.onetimer(ctx.agent, {
        date: expired(),
        status,
        matches: [
          { volunteer, status: OpportunityVolunteerStatusType.MATCHED },
        ],
      });

      await scanExpiredOnetimers(ctx.fastify);

      expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(status);
      expect(await ctx.fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.MATCHED,
      );
    },
  );

  it("skips an expired opportunity that is not a onetimer type", async () => {
    const { opportunity } = await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      type: OpportunityType.REGULAR,
    });

    await scanExpiredOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
  });

  it("releases each finished volunteer back to available and logs the change", async () => {
    const first = await ctx.fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    const second = await ctx.fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      status: OpportunityStatusType.ACTIVE,
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.ACTIVE },
        { volunteer: second, status: OpportunityVolunteerStatusType.ACTIVE },
      ],
    });

    await scanExpiredOnetimers(ctx.fastify);

    for (const volunteer of [first, second]) {
      expect(await ctx.fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.AVAILABLE,
      );
      expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(1);
    }
  });

  it("keeps a volunteer engaged who is still active on another opportunity", async () => {
    const volunteer = await ctx.fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.ACTIVE }],
    });
    await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date(),
      status: OpportunityStatusType.ACTIVE,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.ACTIVE }],
    });

    await scanExpiredOnetimers(ctx.fastify);

    expect(await ctx.fixtures.engagement(volunteer)).toBe(
      VolunteerStateEngagementType.ACTIVE,
    );
    expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(0);
  });

  it("keeps processing the remaining opportunities when one fails", async () => {
    const failingVolunteer = await ctx.fixtures.volunteer();
    const succeedingVolunteer = await ctx.fixtures.volunteer();
    const failing = await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      matches: [
        {
          volunteer: failingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    const succeeding = await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      matches: [
        {
          volunteer: succeedingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    failSaveOf(OpportunityVolunteer, failing.matches[0].id);

    await scanExpiredOnetimers(ctx.fastify);

    expect(ctx.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: failing.opportunity.id }),
      expect.stringContaining(
        "failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      ),
    );
    expect(await ctx.fixtures.opportunityStatus(failing.opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await ctx.fixtures.matchStatus(failing.matches[0])).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(await ctx.fixtures.opportunityStatus(succeeding.opportunity)).toBe(
      OpportunityStatusType.PAST,
    );
    expect(await ctx.fixtures.matchStatus(succeeding.matches[0])).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
  });

  it("rolls back the whole opportunity when one volunteer fails, instead of applying it partially", async () => {
    const first = await ctx.fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    const second = await ctx.fixtures.volunteer(
      VolunteerStateEngagementType.ACTIVE,
    );
    const { opportunity, matches } = await ctx.fixtures.onetimer(ctx.agent, {
      date: expired(),
      status: OpportunityStatusType.ACTIVE,
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.ACTIVE },
        { volunteer: second, status: OpportunityVolunteerStatusType.ACTIVE },
      ],
    });
    failSaveOf(OpportunityVolunteer, matches[1].id);

    await scanExpiredOnetimers(ctx.fastify);

    expect(ctx.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        opportunityId: opportunity.id,
        opportunityVolunteerIds: expect.arrayContaining(
          matches.map(({ id }) => id),
        ),
      }),
      expect.stringContaining(
        "failed to mark opportunity and its volunteer(s) as PAST/INACTIVE",
      ),
    );
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    for (const match of matches) {
      expect(await ctx.fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.ACTIVE,
      );
    }
    for (const volunteer of [first, second]) {
      expect(await ctx.fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.ACTIVE,
      );
      expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(0);
    }
  });
});
