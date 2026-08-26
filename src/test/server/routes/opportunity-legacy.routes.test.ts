import { FastifyInstance } from "fastify";
import { OpportunityStatusType, OpportunityType } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Deal from "../../../data/entity/deal.entity";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { DealType } from "../../../data/types";
import { createServer } from "../../../server";

// be#780: GET /opportunity/legacy is public/unauthenticated and unconditionally
// serialized whatever "accompanying" row it found linked to an opportunity,
// regardless of that opportunity's current type. Combined with the
// write-path bug (fixed alongside this test — a type change away from
// ACCOMPANYING could leave the old row linked), this endpoint could leak
// refugee PII to anyone. This test simulates the stale-row case directly
// (bypassing the now-fixed write path) to prove the read path itself is safe.
describe("GET /opportunity/legacy", () => {
  let fastify: FastifyInstance;
  let agent: Agent;
  let deal: Deal;
  let accompanying: Accompanying;
  let opportunity: Opportunity;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent (legacy-pii) ${suffix}` }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    accompanying = await fastify.db.accompanyingRepository.save(
      new Accompanying({
        address: "Secret Street 1",
        name: "Refugee Secret Name",
        phone: "+491234567",
        email: "secret@example.com",
      }),
    );
    // Simulates a stale row: a REGULAR-type opportunity that still has
    // accompanyingId set (the exact shape the write-path bug could leave
    // behind before this fix, or that existed from before be#742).
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (legacy-pii) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
        dealId: deal.id,
        accompanyingId: accompanying.id,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.accompanyingRepository.delete({ id: accompanying.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("does not leak PII from a stale accompanying row linked to a non-ACCOMPANYING opportunity", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: "/opportunity/legacy",
    });

    expect(res.statusCode).toBe(200);
    const entries = res.json();
    const entry = entries.find((e: { id: number }) => e.id === opportunity.id);
    expect(entry).toBeDefined();
    expect(entry.accomp_information).toBeNull();
    expect(entry.accomp_translation).toBeNull();
    expect(JSON.stringify(entry)).not.toContain("Refugee Secret Name");
    expect(JSON.stringify(entry)).not.toContain("+491234567");
    expect(JSON.stringify(entry)).not.toContain("secret@example.com");
  });
});
