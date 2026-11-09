import { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import { createServer } from "../../../server";
import {
  CommutePairsFixture,
  createCommutePairsFixture,
} from "../commute-pairs.fixture";

interface PairRow {
  volunteerId: number;
  opportunityId: number;
  commute?: { min: number; max: number } | null;
}

const RANGE_27 = { min: 25, max: 30 };
const RANGE_30 = { min: 30, max: 35 };

describe("commute range on volunteer-opportunity pairs", () => {
  let fastify: FastifyInstance;
  let f: CommutePairsFixture;

  const commuteByVolunteer = (rows: PairRow[]) =>
    Object.fromEntries(rows.map((row) => [row.volunteerId, row.commute]));
  const commuteByOpportunity = (rows: PairRow[]) =>
    Object.fromEntries(rows.map((row) => [row.opportunityId, row.commute]));

  async function countCommuteQueries(run: () => Promise<unknown>) {
    const spy = vi.spyOn(dataSource, "query");
    await run();
    const count = spy.mock.calls.filter(([sql]) =>
      String(sql).includes("postcode_commute"),
    ).length;
    spy.mockRestore();
    return count;
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    f = await createCommutePairsFixture(fastify);
  });

  afterAll(async () => {
    await f.cleanup();
    await fastify.close();
  });

  describe("GET /opportunity/:id/volunteer-linked", () => {
    const url = () =>
      `/opportunity/${f.opportunities.ownWork.id}/volunteer-linked`;

    it("gives a coordinator the range per linked volunteer, null when unknown", async () => {
      const res = await f.get("coordinator", url());
      expect(res.statusCode).toBe(200);
      expect(commuteByVolunteer(res.json().data)).toEqual({
        [f.volunteers.commuter.id]: RANGE_27,
        [f.volunteers.dealOnly.id]: RANGE_27,
        [f.volunteers.nowhere.id]: null,
        [f.volunteers.noCommute.id]: null,
        [f.volunteers.owned.id]: RANGE_27,
      });
    });

    it("gives the owning NGO the ranges too", async () => {
      const res = await f.get("agent", url());
      expect(res.statusCode).toBe(200);
      expect(
        commuteByVolunteer(res.json().data)[f.volunteers.commuter.id],
      ).toEqual(RANGE_27);
    });

    it("does not show a volunteer any commute", async () => {
      const res = await f.get("owned", url());
      expect(res.statusCode).toBe(200);
      const rows: PairRow[] = res.json().data;
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => expect(row).not.toHaveProperty("commute"));
    });

    it("looks the ranges up in a single query", async () => {
      expect(await countCommuteQueries(() => f.get("coordinator", url()))).toBe(
        1,
      );
    });
  });

  describe("GET /agent/:id/volunteer-linked", () => {
    const url = () => `/agent/${f.agent.id}/volunteer-linked`;

    it("gives the NGO the range per pair on its opportunities", async () => {
      const res = await f.get("agent", url());
      expect(res.statusCode).toBe(200);
      const commuter = (res.json().data as PairRow[]).filter(
        (row) => row.volunteerId === f.volunteers.commuter.id,
      );
      expect(commuteByOpportunity(commuter)).toEqual({
        [f.opportunities.ownWork.id]: RANGE_27,
        [f.opportunities.ownOther.id]: RANGE_30,
        [f.opportunities.ownNoPostcode.id]: null,
      });
    });

    it("looks the ranges up in a single query", async () => {
      expect(await countCommuteQueries(() => f.get("agent", url()))).toBe(1);
    });
  });

  describe("GET /volunteer/:id/opportunity-linked", () => {
    const url = () =>
      `/volunteer/${f.volunteers.commuter.id}/opportunity-linked`;

    it("gives a coordinator the range per linked opportunity", async () => {
      const res = await f.get("coordinator", url());
      expect(res.statusCode).toBe(200);
      expect(commuteByOpportunity(res.json().data)).toEqual({
        [f.opportunities.ownWork.id]: RANGE_27,
        [f.opportunities.ownOther.id]: RANGE_30,
        [f.opportunities.ownNoPostcode.id]: null,
        [f.opportunities.foreignWork.id]: RANGE_27,
      });
    });

    it("gives an NGO ranges only on its own opportunities", async () => {
      const res = await f.get("agent", url());
      expect(res.statusCode).toBe(200);
      expect(commuteByOpportunity(res.json().data)).toEqual({
        [f.opportunities.ownWork.id]: RANGE_27,
        [f.opportunities.ownOther.id]: RANGE_30,
        [f.opportunities.ownNoPostcode.id]: null,
        [f.opportunities.foreignWork.id]: null,
      });
    });

    it("does not show a volunteer their own commutes", async () => {
      const res = await f.get(
        "owned",
        `/volunteer/${f.volunteers.owned.id}/opportunity-linked`,
      );
      expect(res.statusCode).toBe(200);
      const rows: PairRow[] = res.json().data;
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => expect(row).not.toHaveProperty("commute"));
    });

    it("looks the ranges up in a single query", async () => {
      expect(await countCommuteQueries(() => f.get("agent", url()))).toBe(1);
    });
  });

  describe("GET /volunteer/:id/commute", () => {
    const url = (
      volunteer: keyof CommutePairsFixture["volunteers"],
      opportunityIds: number[],
    ) =>
      `/volunteer/${f.volunteers[volunteer].id}/commute?${opportunityIds
        .map((id) => `opportunity=${id}`)
        .join("&")}`;

    it("gives a coordinator the range per requested opportunity, in order", async () => {
      const res = await f.get(
        "coordinator",
        url("commuter", [
          f.opportunities.foreignWork.id,
          f.opportunities.ownOther.id,
          f.opportunities.ownNoPostcode.id,
          f.opportunities.ownOther.id,
          999999999,
        ]),
      );
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([
        { opportunityId: f.opportunities.foreignWork.id, commute: RANGE_27 },
        { opportunityId: f.opportunities.ownOther.id, commute: RANGE_30 },
        { opportunityId: f.opportunities.ownNoPostcode.id, commute: null },
      ]);
    });

    it("accepts a single opportunity", async () => {
      const res = await f.get(
        "agent",
        url("dealOnly", [f.opportunities.ownWork.id]),
      );
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([
        { opportunityId: f.opportunities.ownWork.id, commute: RANGE_27 },
      ]);
    });

    it("leaves out another NGO's opportunities for an NGO user", async () => {
      const res = await f.get(
        "agent",
        url("commuter", [
          f.opportunities.ownWork.id,
          f.opportunities.foreignWork.id,
        ]),
      );
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([
        { opportunityId: f.opportunities.ownWork.id, commute: RANGE_27 },
      ]);
    });

    it("hides a volunteer the NGO cannot see", async () => {
      const res = await f.get(
        "otherAgent",
        url("owned", [f.opportunities.foreignWork.id]),
      );
      expect(res.statusCode).toBe(404);
    });

    it("is not available to volunteers", async () => {
      const res = await f.get(
        "owned",
        url("owned", [f.opportunities.ownWork.id]),
      );
      expect(res.statusCode).toBe(403);
    });

    it("404s for an unknown volunteer", async () => {
      const res = await f.get(
        "coordinator",
        `/volunteer/999999999/commute?opportunity=${f.opportunities.ownWork.id}`,
      );
      expect(res.statusCode).toBe(404);
    });

    it.each([
      ["no opportunity", ""],
      ["a non-numeric opportunity", "?opportunity=abc"],
    ])("rejects %s with 400", async (_, query) => {
      const res = await f.get(
        "coordinator",
        `/volunteer/${f.volunteers.commuter.id}/commute${query}`,
      );
      expect(res.statusCode).toBe(400);
    });

    it("looks the ranges up in a single query", async () => {
      expect(
        await countCommuteQueries(() =>
          f.get(
            "coordinator",
            url(
              "commuter",
              Object.values(f.opportunities).map(({ id }) => id),
            ),
          ),
        ),
      ).toBe(1);
    });
  });
});
