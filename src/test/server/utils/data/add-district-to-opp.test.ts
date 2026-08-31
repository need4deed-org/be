/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpportunityType } from "need4deed-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import { getDistrictFromPostcode } from "../../../../data/utils/get-district";
import { getDistrictToOpportunityHandler } from "../../../../server/utils";

vi.mock("../../../../data/utils/get-district", () => ({
  getDistrictFromPostcode: vi.fn(),
}));

const mockedGetDistrictFromPostcode = vi.mocked(getDistrictFromPostcode);

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function makeOpportunity(
  overrides: DeepPartial<Opportunity> = {},
): Opportunity {
  return {
    id: 1,
    type: OpportunityType.ACCOMPANYING,
    districtId: undefined,
    district: undefined,
    agent: undefined,
    deal: undefined,
    accompanying: undefined,
    ...overrides,
  } as Opportunity;
}

function makeDistrict(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Test District",
    ...overrides,
  };
}

describe("getDistrictToOpportunityHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addDistrictToOpportunity", () => {
    it("does nothing if opportunity.districtId is already set", async () => {
      const handler = getDistrictToOpportunityHandler();
      const opportunity = makeOpportunity({
        type: OpportunityType.REGULAR,
        districtId: 3,
        agent: { districtId: 99 } as any,
      });

      const result = await handler.addDistrictToOpportunity(opportunity);

      expect(result.districtId).toBe(3);
      expect(handler.updates).toHaveLength(0);
      expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
    });

    describe("REGULAR / EVENTS", () => {
      it("uses the opportunity's own agent's districtId", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.REGULAR,
          agent: { districtId: 5 } as any,
        });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.districtId).toBe(5);
        expect(handler.updates).toContain(opportunity);
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
      });

      it("falls back to the agent's own address postcode when agent.districtId is missing", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 202 });
        const opportunity = makeOpportunity({
          type: OpportunityType.EVENTS,
          agent: { address: { postcode: "54321" } } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith("54321");
        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });

      it("does not add to updates if no agent info is available", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.REGULAR,
          agent: undefined,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBeUndefined();
        expect(result.districtId).toBeUndefined();
        expect(handler.updates).toHaveLength(0);
      });
    });

    describe("ACCOMPANYING resolution priority", () => {
      it("Priority 1: resolves from the accompanying's own postcode relation", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 101 });
        const postcode = { id: 7, value: "12345" };
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          accompanying: { postcode } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith(postcode);
        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });

      it("resolves from accompanying.postcodeId when the postcode relation isn't loaded", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 303 });
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          accompanying: { postcodeId: 42 } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith(
          expect.objectContaining({ id: 42 }),
        );
        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });

      it("Priority 2: falls back to agent.districtId if the appointment postcode lookup fails", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          accompanying: { postcode: { id: 7 } } as any,
          agent: { districtId: 99 } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledTimes(1);
        expect(result.districtId).toBe(99);
        expect(handler.updates).toContain(opportunity);
      });

      it("Priority 3: falls back to the agent's address postcode if agent.districtId is also missing", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 202 });
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          accompanying: { postcode: { id: 7 } } as any,
          agent: { address: { postcode: "54321" } } as any,
        });

        // First call (appointment postcode) returns nothing, second call
        // (agent's own postcode) resolves.
        mockedGetDistrictFromPostcode
          .mockResolvedValueOnce(undefined!)
          .mockResolvedValueOnce(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledTimes(2);
        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });

      it("handles a missing accompanying object gracefully", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          accompanying: undefined,
          agent: { districtId: 77 } as any,
        });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.districtId).toBe(77);
        expect(handler.updates).toHaveLength(1);
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
      });

      it("does not add to updates if no district info is found anywhere", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          accompanying: undefined,
          agent: undefined,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBeUndefined();
        expect(handler.updates).toHaveLength(0);
      });
    });
  });

  describe("updates tracking", () => {
    it("accumulates multiple valid updates", async () => {
      const handler = getDistrictToOpportunityHandler();
      mockedGetDistrictFromPostcode.mockResolvedValue(makeDistrict() as any);

      const o1 = makeOpportunity({
        type: OpportunityType.ACCOMPANYING,
        accompanying: { postcode: { id: 1 } } as any,
      });
      const o2 = makeOpportunity({
        type: OpportunityType.ACCOMPANYING,
        accompanying: { postcode: { id: 2 } } as any,
      });

      await handler.addDistrictToOpportunity(o1);
      await handler.addDistrictToOpportunity(o2);

      expect(handler.updates).toHaveLength(2);
    });
  });
});
