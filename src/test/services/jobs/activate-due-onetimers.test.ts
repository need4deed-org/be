import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import { activateDueOnetimers } from "../../../services/jobs/activate-due-onetimers";
import { DAY } from "../../time";
import { failSaveOf, setupOnetimerJobTest } from "./onetimer-fixtures";

vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (await import("./onetimer-query-scope")).scopeOnetimerQuery(
      await importOriginal(),
    ),
);

describe("activateDueOnetimers", () => {
  const ctx = setupOnetimerJobTest();
  const now = () => new Date();
  const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

  it("activates an opportunity due today and its matched volunteer", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(ctx.loggerInfo).toHaveBeenCalledWith(
      expect.stringContaining("activateDueOnetimers: 1 candidates, 1 applied"),
    );
  });

  it("catches up on an opportunity due on an earlier day, so a missed run is not lost", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const { opportunity } = await ctx.fixtures.onetimer(ctx.agent, {
      date: daysFromNow(-3),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
  });

  it("does nothing when no opportunity is due yet", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: daysFromNow(2),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(ctx.fastify);

    expect(ctx.loggerInfo).not.toHaveBeenCalled();
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });

  it.each([
    OpportunityStatusType.ACTIVE,
    OpportunityStatusType.INACTIVE,
    OpportunityStatusType.PAST,
  ])("skips a due opportunity that is already %s", async (status) => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      status,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(status);
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
  });

  it("skips a due opportunity without a matched volunteer", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.PENDING }],
    });

    await activateDueOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("activates only the matched volunteer, leaving other candidates as they are", async () => {
    const matchedVolunteer = await ctx.fixtures.volunteer();
    const pendingVolunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [matched, pending],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
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

    await activateDueOnetimers(ctx.fastify);

    expect(ctx.loggerError).not.toHaveBeenCalled();
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(matched)).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(pending)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("skips a due opportunity that is not a onetimer type", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const { opportunity } = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      type: OpportunityType.REGULAR,
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });

    await activateDueOnetimers(ctx.fastify);

    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
  });

  it("marks each activated volunteer as engaged and logs the change", async () => {
    const first = await ctx.fixtures.volunteer();
    const second = await ctx.fixtures.volunteer();
    await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.MATCHED },
        { volunteer: second, status: OpportunityVolunteerStatusType.MATCHED },
      ],
    });

    await activateDueOnetimers(ctx.fastify);

    for (const volunteer of [first, second]) {
      expect(await ctx.fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.ACTIVE,
      );
      expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(1);
    }
  });

  it("keeps processing the remaining opportunities when one fails", async () => {
    const failingVolunteer = await ctx.fixtures.volunteer();
    const succeedingVolunteer = await ctx.fixtures.volunteer();
    const failing = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      matches: [
        {
          volunteer: failingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    const succeeding = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      matches: [
        {
          volunteer: succeedingVolunteer,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    failSaveOf(OpportunityVolunteer, failing.matches[0].id);

    await activateDueOnetimers(ctx.fastify);

    expect(ctx.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: failing.opportunity.id }),
      expect.stringContaining(
        "failed to activate opportunity and its volunteer(s)",
      ),
    );
    expect(await ctx.fixtures.opportunityStatus(failing.opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    expect(await ctx.fixtures.matchStatus(failing.matches[0])).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(await ctx.fixtures.opportunityStatus(succeeding.opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(succeeding.matches[0])).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
  });

  it("rolls back the whole opportunity when one volunteer fails, instead of applying it partially", async () => {
    const first = await ctx.fixtures.volunteer();
    const second = await ctx.fixtures.volunteer();
    const { opportunity, matches } = await ctx.fixtures.onetimer(ctx.agent, {
      date: now(),
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.MATCHED },
        { volunteer: second, status: OpportunityVolunteerStatusType.MATCHED },
      ],
    });
    failSaveOf(OpportunityVolunteer, matches[1].id);

    await activateDueOnetimers(ctx.fastify);

    expect(ctx.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: opportunity.id }),
      expect.stringContaining(
        "failed to activate opportunity and its volunteer(s)",
      ),
    );
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
    for (const match of matches) {
      expect(await ctx.fixtures.matchStatus(match)).toBe(
        OpportunityVolunteerStatusType.MATCHED,
      );
    }
    for (const volunteer of [first, second]) {
      expect(await ctx.fixtures.engagement(volunteer)).toBe(
        VolunteerStateEngagementType.AVAILABLE,
      );
      expect(await ctx.fixtures.engagementLogs(volunteer)).toHaveLength(0);
    }
  });
});
