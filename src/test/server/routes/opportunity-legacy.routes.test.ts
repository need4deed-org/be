import { FastifyInstance } from "fastify";
import {
  OpportunityLegacyType,
  OpportunityStatusType,
  OpportunityType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import { DealType } from "../../../data/types";
import { getRepository } from "../../../data/utils";
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

// Regression test for be#926 review: findOrCreateAgent's new-agent branch
// built an Agent with only title/addressId set, so addDistrictToOpportunity's
// agent-based resolution (agent.districtId, then agent.address.postcode)
// found nothing for a REGULAR/EVENTS opportunity created against a
// brand-new agent via the legacy form — the same "district stays NULL"
// bug fixed for POST /opportunity's own create path.
describe("POST /opportunity/legacy resolves district for a brand-new agent", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let district: District;
  let postcode: Postcode;
  let districtPostcode: DistrictPostcode;
  let createdOpportunityId: number;
  let createdAgentId: number | undefined;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    district = await getRepository(dataSource, District).save(
      new District({ title: `Test District (legacy-new-agent) ${suffix}` }),
    );
    postcode = await getRepository(dataSource, Postcode).save(
      new Postcode({
        value: `9${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}`,
      }),
    );
    districtPostcode = await getRepository(dataSource, DistrictPostcode).save(
      new DistrictPostcode({
        postcodeId: postcode.id,
        districtId: district.id,
      }),
    );
  });

  afterAll(async () => {
    if (createdOpportunityId) {
      await fastify.db.opportunityRepository.delete({
        id: createdOpportunityId,
      });
    }
    if (createdAgentId) {
      await fastify.db.agentRepository.delete({ id: createdAgentId });
    }
    await getRepository(dataSource, DistrictPostcode).delete({
      id: districtPostcode.id,
    });
    await getRepository(dataSource, Postcode).delete({ id: postcode.id });
    await getRepository(dataSource, District).delete({ id: district.id });
    await fastify.close();
  });

  it("sets districtId from the newly created agent's postcode, without needing a follow-up GET", async () => {
    // No berlin_locations, so parseOpportunityLegacy's own (title-based)
    // district guess resolves to nothing and addDistrictToOpportunity's
    // agent-based fallback is what has to do the work.
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity/legacy",
      payload: {
        title: `Test Opportunity (legacy-new-agent) ${suffix}`,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        languages: [],
        activities: [],
        skills: [],
        rac_address: `Teststrasse-${suffix} 1`,
        rac_plz: postcode.value,
      },
    });

    expect(res.statusCode).toBe(200);
    createdOpportunityId = res.json().data.id;

    const opportunityRepository = getRepository(dataSource, Opportunity);
    const saved = await opportunityRepository.findOneOrFail({
      where: { id: createdOpportunityId },
    });
    createdAgentId = saved.agentId ?? undefined;

    expect(saved.districtId).toBe(district.id);
  });
});
