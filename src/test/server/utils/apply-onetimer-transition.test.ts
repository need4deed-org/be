import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import { applyOnetimerTransition } from "../../../server/utils/data/apply-onetimer-transition";
import { activationPlan } from "../../../services/jobs/activate-due-onetimers";
import { expiryPlan } from "../../../services/jobs/scan-expired-onetimers";
import { setupOnetimerJobTest } from "../../services/jobs/onetimer-fixtures";
import { DAY } from "../../time";

vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (
      await import("../../services/jobs/onetimer-query-scope")
    ).scopeOnetimerQuery(await importOriginal()),
);

describe("applyOnetimerTransition decides on the rows as they are under the lock", () => {
  const ctx = setupOnetimerJobTest();
  const lastWeek = () => new Date(Date.now() - 7 * DAY);
  const endOfToday = () => new Date(Date.now() + DAY / 2);
  const expire = (id: number) =>
    applyOnetimerTransition(
      ctx.fastify,
      id,
      expiryPlan(new Date()),
      "expire failed",
    );
  const activate = (id: number) =>
    applyOnetimerTransition(
      ctx.fastify,
      id,
      activationPlan(endOfToday()),
      "activate failed",
    );

  it("skips an opportunity a coordinator closed meanwhile, leaving its match as it is", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });
    await ctx.fastify.db.opportunityRepository.update(
      { id: opportunity.id },
      { status: OpportunityStatusType.INACTIVE },
    );

    expect(await activate(opportunity.id)).toBe("skipped");
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.INACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(ctx.loggerError).not.toHaveBeenCalled();
  });

  it("skips a onetimer rescheduled into the future meanwhile", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const { opportunity } = await ctx.fixtures.onetimer(ctx.agent, {
      date: lastWeek(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });
    await ctx.fastify.db.onetimerRepository.update(
      { id: opportunity.onetimerId },
      { date: new Date(Date.now() + 30 * DAY) },
    );

    expect(await expire(opportunity.id)).toBe("skipped");
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.SEARCHING,
    );
  });

  it("closes as INACTIVE when the only matched volunteer was moved back to pending meanwhile", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: lastWeek(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });
    await ctx.fastify.db.opportunityVolunteerRepository.save({
      id: match.id,
      status: OpportunityVolunteerStatusType.PENDING,
    });

    expect(await expire(opportunity.id)).toBe("applied");
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.INACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
  });

  it("includes a match added meanwhile and doesn't re-create a deleted one", async () => {
    const [removed, added] = [
      await ctx.fixtures.volunteer(),
      await ctx.fixtures.volunteer(),
    ];
    const {
      opportunity,
      matches: [deleted],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: lastWeek(),
      matches: [
        { volunteer: removed, status: OpportunityVolunteerStatusType.MATCHED },
      ],
    });
    await ctx.fastify.db.opportunityVolunteerRepository.delete({
      id: deleted.id,
    });
    const late = await ctx.fastify.db.opportunityVolunteerRepository.save({
      opportunityId: opportunity.id,
      volunteerId: added.id,
      status: OpportunityVolunteerStatusType.MATCHED,
    });

    expect(await expire(opportunity.id)).toBe("applied");
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.PAST,
    );
    expect(await ctx.fixtures.matchStatus(late)).toBe(
      OpportunityVolunteerStatusType.PAST,
    );
    expect(
      await ctx.fastify.db.opportunityVolunteerRepository.existsBy({
        id: deleted.id,
      }),
    ).toBe(false);
  });
});
