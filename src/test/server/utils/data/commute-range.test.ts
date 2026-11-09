import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../../data/data-source";
import { createServer } from "../../../../server";
import {
  commutePairKey,
  loadCommuteRanges,
} from "../../../../server/utils/data/commute-range";
import {
  CommuteOpportunityKey,
  CommutePairsFixture,
  CommuteVolunteerKey,
  createCommutePairsFixture,
} from "../../commute-pairs.fixture";

describe("loadCommuteRanges", () => {
  let fastify: FastifyInstance;
  let fixture: CommutePairsFixture;

  const pair = (
    volunteer: CommuteVolunteerKey,
    opportunity: CommuteOpportunityKey,
  ) => ({
    volunteerId: fixture.volunteers[volunteer].id,
    opportunityId: fixture.opportunities[opportunity].id,
  });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    fixture = await createCommutePairsFixture(fastify);
  });

  afterAll(async () => {
    await fixture.cleanup();
    await fastify.close();
  });

  it("buckets the travel time into a 5-minute range", async () => {
    const pairs = [pair("commuter", "ownWork"), pair("commuter", "ownOther")];
    const ranges = await loadCommuteRanges(pairs);
    expect(ranges.get(commutePairKey(pairs[0]))).toEqual({ min: 25, max: 30 });
    expect(ranges.get(commutePairKey(pairs[1]))).toEqual({ min: 30, max: 35 });
  });

  it("measures from the volunteer's address, else their deal postcode", async () => {
    const pairs = [pair("commuter", "ownWork"), pair("dealOnly", "ownWork")];
    const ranges = await loadCommuteRanges(pairs);
    expect([...ranges.values()]).toEqual([
      { min: 25, max: 30 },
      { min: 25, max: 30 },
    ]);
  });

  it("treats a pair in the same postcode as 0 to 5 minutes", async () => {
    const pairs = [pair("commuter", "ownHome")];
    const ranges = await loadCommuteRanges(pairs);
    expect(ranges.get(commutePairKey(pairs[0]))).toEqual({ min: 0, max: 5 });
  });

  it.each([
    ["the volunteer has no postcode", "nowhere", "ownWork"],
    ["the opportunity has no postcode", "commuter", "ownNoPostcode"],
    ["the pair has no travel time", "noCommute", "ownWork"],
  ] as const)("is null when %s", async (_, volunteer, opportunity) => {
    const pairs = [pair(volunteer, opportunity)];
    const ranges = await loadCommuteRanges(pairs);
    expect(ranges.get(commutePairKey(pairs[0]))).toBeNull();
  });

  it("runs a single query for many pairs and none for no pairs", async () => {
    const spy = vi.spyOn(dataSource, "query");
    await loadCommuteRanges([]);
    expect(spy).not.toHaveBeenCalled();
    await loadCommuteRanges(
      (["commuter", "dealOnly", "nowhere", "noCommute", "owned"] as const).map(
        (volunteer) => pair(volunteer, "ownWork"),
      ),
    );
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
