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
    describe("Non-ACCOMPANYING Type", () => {
      it("assigns district from deal location and returns early", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 5 });
        const opportunity = makeOpportunity({
          type: OpportunityType.REGULAR,
          deal: {
            location: {
              locationDistrict: [{ district }],
            },
          } as any,
        });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
      });
    });

    describe("ACCOMPANYING Type Resolution Priority", () => {
      it("Priority 1: assigns district from deal postcode", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 101 });
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          deal: { postcode: "12345" } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith("12345");
        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });

      it("Priority 2: falls back to agent.districtId if deal postcode lookup fails", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          deal: { postcode: "INVALID" } as any,
          agent: { districtId: 99 } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.districtId).toBe(99);
        expect(handler.updates).toContain(opportunity);
      });

      it("Priority 3: falls back to agent postcode if agent.districtId is missing", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 202 });
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          deal: { postcode: "INVALID" } as any,
          agent: {
            address: { postcode: "54321" },
          } as any,
        });

        // First call (deal postcode) returns null, second call (agent postcode) returns district
        mockedGetDistrictFromPostcode
          .mockResolvedValueOnce(undefined!)
          .mockResolvedValueOnce(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledTimes(2);
        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });
    });

    describe("Edge Cases", () => {
      it("does not add to updates if no district info is found anywhere", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          deal: undefined,
          agent: undefined,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBeUndefined();
        expect(handler.updates).toHaveLength(0);
      });

      it("handles missing deal object gracefully for ACCOMPANYING type", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          agent: { districtId: 77 } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        await handler.addDistrictToOpportunity(opportunity);

        expect(opportunity.districtId).toBe(77);
        expect(handler.updates).toHaveLength(1);
      });
    });
  });

  describe("updates tracking", () => {
    it("accumulates multiple valid updates", async () => {
      const handler = getDistrictToOpportunityHandler();
      mockedGetDistrictFromPostcode.mockResolvedValue(makeDistrict() as any);

      const o1 = makeOpportunity({
        type: OpportunityType.ACCOMPANYING,
        deal: { postcode: "1" } as any,
      });
      const o2 = makeOpportunity({
        type: OpportunityType.ACCOMPANYING,
        deal: { postcode: "2" } as any,
      });

      await handler.addDistrictToOpportunity(o1);
      await handler.addDistrictToOpportunity(o2);

      expect(handler.updates).toHaveLength(2);
    });
  });
});
