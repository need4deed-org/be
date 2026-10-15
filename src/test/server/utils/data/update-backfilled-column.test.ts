import { FastifyInstance } from "fastify";
import { OpportunityType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Deal from "../../../../data/entity/deal.entity";
import Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import { DealType } from "../../../../data/types";
import { createServer } from "../../../../server";
import { updateBackfilledColumn } from "../../../../server/utils/data/update-backfilled-column";
import { randomNumericSuffix } from "../../../random";

describe("updateBackfilledColumn", () => {
  let fastify: FastifyInstance;
  const prefix = `Backfill ${randomNumericSuffix()}`;
  let postcodeId: number;
  let districtId: number;
  const deals: Deal[] = [];
  const opportunityIds: number[] = [];

  const createOpportunity = async (key: string) => {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    deals.push(deal);
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `${prefix} ${key}`,
        type: OpportunityType.REGULAR,
        dealId: deal.id,
      }),
    );
    opportunityIds.push(opportunity.id);
    return fastify.db.opportunityRepository.findOneByOrFail({
      id: opportunity.id,
    });
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    ({ id: postcodeId } = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    }));
    [{ id: districtId }] = await fastify.db.agentRepository.manager.query(
      `SELECT id FROM district ORDER BY id LIMIT 1`,
    );
  });

  afterAll(async () => {
    for (const id of opportunityIds) {
      await fastify.db.opportunityRepository.delete({ id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    await fastify?.close();
  });

  it("writes only the backfilled column", async () => {
    const opportunity = await createOpportunity("kept");
    opportunity.districtId = districtId;
    opportunity.title = `${prefix} renamed in memory`;

    await updateBackfilledColumn(
      fastify.db.opportunityRepository,
      [opportunity],
      "districtId",
    );

    const saved = await fastify.db.opportunityRepository.findOneByOrFail({
      id: opportunity.id,
    });
    expect(saved.districtId).toBe(districtId);
    expect(saved.title).toBe(`${prefix} kept`);
  });

  it("does not bring back a row deleted in the meantime", async () => {
    const opportunity = await createOpportunity("deleted");
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    opportunity.districtId = districtId;

    await updateBackfilledColumn(
      fastify.db.opportunityRepository,
      [opportunity],
      "districtId",
    );

    expect(
      await fastify.db.opportunityRepository.existsBy({ id: opportunity.id }),
    ).toBe(false);
  });
});
