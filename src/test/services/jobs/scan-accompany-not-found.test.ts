import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Onetimer from "../../../data/entity/opportunity/onetimer.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { DealType } from "../../../data/types";
import { createServer } from "../../../server";
import {
  addWorkingDays,
  berlinDayBoundaries,
  berlinToday,
} from "../../../services/jobs/german-holidays";
import { scanAccompanyNotFound } from "../../../services/jobs/scan-accompany-not-found";

// Regression coverage for be#746: the query moved from
// `where: { accompanying: { date: ... } }` to
// `where: { onetimer: { date: ... } }` when the appointment date moved off
// `Accompanying` onto the new `Onetimer` entity. This exercises the real
// query/relations against the DB rather than mocking the repository, since a
// wrong relation/column name here would only surface at runtime.
describe("scanAccompanyNotFound", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let dealInWindow: Deal;
  let dealOutOfWindow: Deal;
  let onetimerInWindow: Onetimer;
  let onetimerOutOfWindow: Onetimer;
  let oppInWindow: Opportunity;
  let oppOutOfWindow: Opportunity;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    fastify.notify.emailAccompanyNotFound = vi
      .fn()
      .mockResolvedValue(undefined);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (scan-not-found) ${suffix}` }),
    );

    const targetDay = addWorkingDays(berlinToday(), 4);
    const { startOfDay } = berlinDayBoundaries(targetDay);
    const inWindowDate = new Date(startOfDay.getTime() + 60 * 60 * 1000);
    const outOfWindowDate = new Date(startOfDay.getTime() - 60 * 60 * 1000);

    onetimerInWindow = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: inWindowDate }),
    );
    onetimerOutOfWindow = await fastify.db.onetimerRepository.save(
      new Onetimer({ date: outOfWindowDate }),
    );

    dealInWindow = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    dealOutOfWindow = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );

    oppInWindow = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Accompanying In Window ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealInWindow.id,
        onetimerId: onetimerInWindow.id,
      }),
    );
    oppOutOfWindow = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Accompanying Out of Window ${suffix}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.ACTIVE,
        agentId: agent.id,
        dealId: dealOutOfWindow.id,
        onetimerId: onetimerOutOfWindow.id,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.communicationRepository.delete({
      opportunityId: oppInWindow.id,
    });
    await fastify.db.communicationRepository.delete({
      opportunityId: oppOutOfWindow.id,
    });
    await fastify.db.opportunityRepository.delete({ id: oppInWindow.id });
    await fastify.db.opportunityRepository.delete({ id: oppOutOfWindow.id });
    await fastify.db.dealRepository.delete({ id: dealInWindow.id });
    await fastify.db.dealRepository.delete({ id: dealOutOfWindow.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerInWindow.id });
    await fastify.db.onetimerRepository.delete({ id: onetimerOutOfWindow.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("emails only for opportunities whose onetimer date falls in the target window", async () => {
    await scanAccompanyNotFound(fastify);

    const calls = (
      fastify.notify.emailAccompanyNotFound as ReturnType<typeof vi.fn>
    ).mock.calls;
    const calledIds = calls.map(([opp]: [Opportunity]) => opp.id);

    expect(calledIds).toContain(oppInWindow.id);
    expect(calledIds).not.toContain(oppOutOfWindow.id);
  });
});
