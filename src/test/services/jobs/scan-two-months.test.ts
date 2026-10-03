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
import { monthsAgo } from "../../../services/jobs/german-holidays";
import { scanPostMatchCheckup } from "../../../services/jobs/scan-post-match-checkup";
import { scanRegularUpdate } from "../../../services/jobs/scan-regular-update";
import { scanStalePending } from "../../../services/jobs/scan-stale-pending";
import { randomNumericSuffix } from "../../random";

// Just past the 2-month threshold.
const PAST_THRESHOLD = new Date(monthsAgo(2).getTime() - 12 * 60 * 60 * 1000);

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
  // No matches: saving a match updates its opportunity afterwards
  // (updateOpportunityMatching, not awaited), undoing the backdate.
  let unmatched: Opportunity;
  let pending: OpportunityVolunteer;
  let matched: OpportunityVolunteer;
  let matchedOpportunity: Opportunity;

  const backdate = <T extends { id: number }>(
    repository: Repository<T>,
    id: number,
  ) =>
    repository.query(
      `UPDATE "${repository.metadata.tableName}" SET "updated_at" = $1 WHERE "id" = $2`,
      [PAST_THRESHOLD, id],
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
    unmatched = await opportunity("Unmatched (2-month scans)");

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
    await backdate(fastify.db.opportunityVolunteerRepository, pending.id);
    await backdate(fastify.db.opportunityVolunteerRepository, matched.id);
    await backdate(fastify.db.opportunityRepository, unmatched.id);
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: volunteer.id,
    });
    await fastify.db.opportunityRepository.delete({ id: regular.id });
    await fastify.db.opportunityRepository.delete({ id: unmatched.id });
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

  const postedIds = (name: "emailStale" | "emailPostMatchCheckup") =>
    (fastify.cronNotify[name] as ReturnType<typeof vi.fn>).mock.calls.map(
      ([ov]: [OpportunityVolunteer]) => ov.id,
    );

  it("scanStalePending posts a stale pending match, recording nothing", async () => {
    await scanStalePending(fastify);

    expect(postedIds("emailStale")).toContain(pending.id);
    expect(
      await communicationsOf({
        opportunityId: regular.id,
        volunteerId: volunteer.id,
      }),
    ).toBe(0);
  });

  it("scanPostMatchCheckup posts a match due a checkup, recording nothing", async () => {
    await scanPostMatchCheckup(fastify);

    expect(postedIds("emailPostMatchCheckup")).toContain(matched.id);
    expect(
      await communicationsOf({
        opportunityId: matchedOpportunity.id,
        volunteerId: volunteer.id,
      }),
    ).toBe(0);
  });

  it("scanRegularUpdate posts a regular opportunity due an update, recording nothing", async () => {
    await scanRegularUpdate(fastify);

    const posted = (
      fastify.cronNotify.emailRegularUpdate as ReturnType<typeof vi.fn>
    ).mock.calls.map(([opp]: [Opportunity]) => opp.id);
    expect(posted).toContain(unmatched.id);
    expect(await communicationsOf({ opportunityId: unmatched.id })).toBe(0);
  });
});
