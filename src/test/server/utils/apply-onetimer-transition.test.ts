import {
  OpportunityStatusType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import { applyOnetimerTransition } from "../../../server/utils/data/apply-onetimer-transition";
import { setupOnetimerJobTest } from "../../services/jobs/onetimer-fixtures";

vi.mock(
  "../../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (
      await import("../../services/jobs/onetimer-query-scope")
    ).scopeOnetimerQuery(await importOriginal()),
);

describe("applyOnetimerTransition with rows changed after the job read them", () => {
  const ctx = setupOnetimerJobTest();

  const activate = (
    opportunity: Parameters<typeof applyOnetimerTransition>[1],
    matches: Parameters<
      typeof applyOnetimerTransition
    >[3][number]["volunteer"][],
  ) =>
    applyOnetimerTransition(
      ctx.fastify,
      opportunity,
      OpportunityStatusType.ACTIVE,
      matches.map((volunteer) => ({
        volunteer,
        status: OpportunityVolunteerStatusType.ACTIVE,
      })),
      "test transition failed",
    );

  it("skips an opportunity a coordinator changed meanwhile, leaving it and its match as they are", async () => {
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

    expect(await activate(opportunity, [match])).toBe("skipped");
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.INACTIVE,
    );
    expect(await ctx.fixtures.matchStatus(match)).toBe(
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(ctx.loggerError).not.toHaveBeenCalled();
  });

  it("leaves a match a coordinator changed meanwhile, and still moves the others", async () => {
    const [changed, untouched] = [
      await ctx.fixtures.volunteer(),
      await ctx.fixtures.volunteer(),
    ];
    const { opportunity, matches } = await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date(),
      matches: [
        { volunteer: changed, status: OpportunityVolunteerStatusType.MATCHED },
        {
          volunteer: untouched,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      ],
    });
    await ctx.fastify.db.opportunityVolunteerRepository.save({
      id: matches[0].id,
      status: OpportunityVolunteerStatusType.PENDING,
    });

    expect(await activate(opportunity, matches)).toBe("applied");
    expect(await ctx.fixtures.matchStatus(matches[0])).toBe(
      OpportunityVolunteerStatusType.PENDING,
    );
    expect(await ctx.fixtures.matchStatus(matches[1])).toBe(
      OpportunityVolunteerStatusType.ACTIVE,
    );
    expect(await ctx.fixtures.opportunityStatus(opportunity)).toBe(
      OpportunityStatusType.ACTIVE,
    );
  });

  it("does not re-insert a match deleted meanwhile", async () => {
    const volunteer = await ctx.fixtures.volunteer();
    const {
      opportunity,
      matches: [match],
    } = await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date(),
      matches: [{ volunteer, status: OpportunityVolunteerStatusType.MATCHED }],
    });
    await ctx.fastify.db.opportunityVolunteerRepository.delete({
      id: match.id,
    });

    expect(await activate(opportunity, [match])).toBe("applied");
    expect(
      await ctx.fastify.db.opportunityVolunteerRepository.existsBy({
        id: match.id,
      }),
    ).toBe(false);
  });
});
