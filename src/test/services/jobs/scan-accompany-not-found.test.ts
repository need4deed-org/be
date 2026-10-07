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
    fastify.cronNotify.emailAccompanyNotFound = vi
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
      fastify.cronNotify.emailAccompanyNotFound as ReturnType<typeof vi.fn>
    ).mock.calls;
    const calledIds = calls.map(([opp]: [Opportunity]) => opp.id);

    expect(calledIds).toContain(oppInWindow.id);
    expect(calledIds).not.toContain(oppOutOfWindow.id);
  });

  // be#1088: posted to Slack, nothing recorded in Communication, so nothing
  // skips the opportunity on a later run of the same day either.
  it("records no Communication row and posts again on a second run", async () => {
    const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
      typeof vi.fn
    >;
    posted.mockClear();

    await scanAccompanyNotFound(fastify);
    await scanAccompanyNotFound(fastify);

    expect(
      posted.mock.calls.filter(
        ([opp]: [Opportunity]) => opp.id === oppInWindow.id,
      ),
    ).toHaveLength(2);
    expect(
      await fastify.db.communicationRepository.countBy({
        opportunityId: oppInWindow.id,
      }),
    ).toBe(0);
  });

  // be#1088 (b): a weekend appointment goes with the working day before it.
  it("on Monday Oct 5, takes Friday to Sunday, leaving Monday for Tuesday", async () => {
    const at = (day: number, hour: number) =>
      new Date(
        berlinDayBoundaries(new Date(2026, 9, day)).startOfDay.getTime() +
          hour * 60 * 60 * 1000,
      );
    const appointments: Record<string, Date> = {
      thursday: at(8, 10),
      friday: at(9, 10),
      saturday: at(10, 10),
      sunday: at(11, 23),
      monday: at(12, 9),
    };
    const created: Record<string, Opportunity> = {};
    const onetimers: number[] = [];
    try {
      for (const [day, date] of Object.entries(appointments)) {
        const onetimer = await fastify.db.onetimerRepository.save(
          new Onetimer({ date }),
        );
        onetimers.push(onetimer.id);
        created[day] = await fastify.db.opportunityRepository.save(
          new Opportunity({
            title: `Weekend check ${day} ${Date.now()}`,
            type: OpportunityType.ACCOMPANYING,
            status: OpportunityStatusType.SEARCHING,
            agentId: agent.id,
            onetimerId: onetimer.id,
          }),
        );
      }
      const posted = fastify.cronNotify.emailAccompanyNotFound as ReturnType<
        typeof vi.fn
      >;
      const postedOn = async (today: Date) => {
        posted.mockClear();
        await scanAccompanyNotFound(fastify, today);
        return posted.mock.calls.map(([opp]: [Opportunity]) => opp.id);
      };

      const monday = await postedOn(new Date(2026, 9, 5));
      const tuesday = await postedOn(new Date(2026, 9, 6));

      for (const day of ["friday", "saturday", "sunday"]) {
        expect(monday).toContain(created[day].id);
        expect(tuesday).not.toContain(created[day].id);
      }
      expect(monday).not.toContain(created.thursday.id);
      expect(monday).not.toContain(created.monday.id);
      expect(tuesday).toContain(created.monday.id);
    } finally {
      for (const opportunity of Object.values(created)) {
        await fastify.db.opportunityRepository.delete({ id: opportunity.id });
      }
      for (const id of onetimers) {
        await fastify.db.onetimerRepository.delete({ id });
      }
    }
  });
});
