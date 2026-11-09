import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { describe, expect, it, vi } from "vitest";
import { setupOnetimerJobTest } from "../services/jobs/onetimer-fixtures";

vi.mock(
  "../../server/utils/data/build-onetimer-opportunity-query",
  async (importOriginal) =>
    (await import("../services/jobs/onetimer-query-scope")).scopeOnetimerQuery(
      await importOriginal(),
    ),
);

describe("saving a parent loaded with a filtered match list", () => {
  const ctx = setupOnetimerJobTest();

  const setup = async () => {
    const [first, second] = [
      await ctx.fixtures.volunteer(),
      await ctx.fixtures.volunteer(),
    ];
    const { opportunity, matches } = await ctx.fixtures.onetimer(ctx.agent, {
      date: new Date(),
      matches: [
        { volunteer: first, status: OpportunityVolunteerStatusType.MATCHED },
        { volunteer: second, status: OpportunityVolunteerStatusType.PENDING },
      ],
    });
    return { first, opportunity, matches };
  };

  const stillLinked = (id: number) =>
    ctx.fastify.db.opportunityVolunteerRepository.existsBy({ id });

  it("leaves an opportunity's other matches alone", async () => {
    const { opportunity, matches } = await setup();
    const loaded = await ctx.fastify.db.opportunityRepository.findOneOrFail({
      where: { id: opportunity.id },
      relations: { opportunityVolunteer: true },
    });
    loaded.opportunityVolunteer = loaded.opportunityVolunteer.filter(
      ({ id }) => id === matches[0].id,
    );

    await ctx.fastify.db.opportunityRepository.save(loaded);

    expect(await stillLinked(matches[1].id)).toBe(true);
  });

  it("leaves a volunteer's other matches alone", async () => {
    const { first, matches } = await setup();
    const loaded = await ctx.fastify.db.volunteerRepository.findOneOrFail({
      where: { id: first.id },
      relations: { opportunityVolunteer: true },
    });
    loaded.opportunityVolunteer = [];

    await ctx.fastify.db.volunteerRepository.save(loaded);

    expect(await stillLinked(matches[0].id)).toBe(true);
  });
});
