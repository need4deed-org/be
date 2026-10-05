import { FastifyInstance } from "fastify";
import {
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { createServer } from "../../../server";
import { crossedMonthsAgo } from "../../../services/jobs/german-holidays";
import { scanPostMatchCheckup } from "../../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../../services/jobs/scan-stale-pending";
import { randomNumericSuffix } from "../../random";

// A fixed run, so the window doesn't depend on today: the run on Oct 3
// takes [Aug 2, Aug 3), the next day's [Aug 3, Aug 4).
const NOW = new Date(2026, 9, 3, 6);
const NEXT_DAY = new Date(2026, 9, 4, 6);
const { from: FROM, to: TO } = crossedMonthsAgo(2, NOW);
const shift = (date: Date, ms: number) => new Date(date.getTime() + ms);
const HOUR = 60 * 60 * 1000;

// be#1088: the "2 months" scans post through fastify.cronNotify (Slack) and
// record nothing in Communication.
describe("2-month scans", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let agent: Agent;
  let person: Person;
  let volunteer: Volunteer;
  const deals: number[] = [];
  let regular: Opportunity;
  // Opportunities without matches at the window's edges: saving a match
  // updates its opportunity (OpportunityVolunteerSubscriber), which would
  // undo the backdate.
  const edges: Record<string, Opportunity> = {};
  const EDGES: Record<string, Date> = {
    atFrom: FROM,
    beforeTo: shift(TO, -1),
    atTo: TO,
    beforeFrom: shift(FROM, -1),
  };
  let pending: OpportunityVolunteer;
  let matched: OpportunityVolunteer;
  let matchedOpportunity: Opportunity;

  const backdate = <T extends { id: number }>(
    repository: Repository<T>,
    id: number,
    updatedAt: Date,
  ) =>
    repository.query(
      `UPDATE "${repository.metadata.tableName}" SET "updated_at" = $1 WHERE "id" = $2`,
      [updatedAt, id],
    );

  const communicationsOf = (where: {
    opportunityId: number;
    volunteerId?: number;
  }) => fastify.db.communicationRepository.countBy(where);

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    for (const name of [
      "emailStale",
      "emailPostMatchCheckup",
      "emailRegularUpdate",
    ] as const) {
      fastify.cronNotify[name] = vi.fn().mockResolvedValue(undefined);
    }

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const deal = async (type: DealType) => {
      const saved = await fastify.db.dealRepository.save(
        new Deal({ type, postcodeId: postcode.id }),
      );
      deals.push(saved.id);
      return saved;
    };
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (2-month scans) ${suffix}` }),
    );
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: `Scans ${suffix}` }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        personId: person.id,
        dealId: (await deal(DealType.VOLUNTEER)).id,
        statusEngagement: VolunteerStateEngagementType.AVAILABLE,
      }),
    );
    const opportunity = async (title: string) =>
      fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `${title} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.ACTIVE,
          agentId: agent.id,
          dealId: (await deal(DealType.OPPORTUNITY)).id,
        }),
      );
    regular = await opportunity("Regular (2-month scans)");
    matchedOpportunity = await opportunity("Matched (2-month scans)");
    for (const [edge, updatedAt] of Object.entries(EDGES)) {
      edges[edge] = await opportunity(`Edge ${edge} (2-month scans)`);
      await backdate(
        fastify.db.opportunityRepository,
        edges[edge].id,
        updatedAt,
      );
    }

    pending = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: regular.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );
    matched = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: matchedOpportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );
    const inWindow = shift(FROM, HOUR);
    await backdate(
      fastify.db.opportunityVolunteerRepository,
      pending.id,
      inWindow,
    );
    await backdate(
      fastify.db.opportunityVolunteerRepository,
      matched.id,
      inWindow,
    );
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: volunteer.id,
    });
    await fastify.db.opportunityRepository.delete({ id: regular.id });
    for (const opportunity of Object.values(edges)) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    await fastify.db.opportunityRepository.delete({
      id: matchedOpportunity.id,
    });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.personRepository.delete({ id: person.id });
    for (const id of deals) {
      await fastify.db.dealRepository.delete({ id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  const posted = (
    name: "emailStale" | "emailPostMatchCheckup" | "emailRegularUpdate",
  ) => {
    const mock = fastify.cronNotify[name] as ReturnType<typeof vi.fn>;
    const ids = mock.mock.calls.map(([row]: [{ id: number }]) => row.id);
    mock.mockClear();
    return ids;
  };

  it("scanStalePending posts a stale pending match once, recording nothing", async () => {
    await scanStalePending(fastify, NOW);
    expect(posted("emailStale")).toContain(pending.id);

    await scanStalePending(fastify, NEXT_DAY);
    expect(posted("emailStale")).not.toContain(pending.id);

    expect(
      await communicationsOf({
        opportunityId: regular.id,
        volunteerId: volunteer.id,
      }),
    ).toBe(0);
  });

  it("scanPostMatchCheckup posts a match due a checkup once, recording nothing", async () => {
    await scanPostMatchCheckup(fastify, NOW);
    expect(posted("emailPostMatchCheckup")).toContain(matched.id);

    await scanPostMatchCheckup(fastify, NEXT_DAY);
    expect(posted("emailPostMatchCheckup")).not.toContain(matched.id);

    expect(
      await communicationsOf({
        opportunityId: matchedOpportunity.id,
        volunteerId: volunteer.id,
      }),
    ).toBe(0);
  });

  it("takes [from, to): the start included, the end left for the next day", async () => {
    await scanRegularUpdate(fastify, NOW);
    const today = posted("emailRegularUpdate");
    await scanRegularUpdate(fastify, NEXT_DAY);
    const nextDay = posted("emailRegularUpdate");

    expect(today).toContain(edges.atFrom.id);
    expect(today).toContain(edges.beforeTo.id);
    expect(today).not.toContain(edges.atTo.id);
    expect(today).not.toContain(edges.beforeFrom.id);
    expect(nextDay).toContain(edges.atTo.id);
    expect(nextDay).not.toContain(edges.atFrom.id);
    expect(nextDay).not.toContain(edges.beforeTo.id);
    expect(await communicationsOf({ opportunityId: edges.atFrom.id })).toBe(0);
  });
});
