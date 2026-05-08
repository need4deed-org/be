/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpportunityType } from "need4deed-sdk"; // Added import
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
    type: OpportunityType.ACCOMPANYING, // Default to ACCOMPANYING to satisfy the agent/postcode logic
    districtId: undefined,
    district: undefined,
    agent: undefined,
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
    describe("early returns (no side-effects)", () => {
      it("returns undefined when opportunity is falsy (undefined)", async () => {
        const handler = getDistrictToOpportunityHandler();

        const result = await handler.addDistrictToOpportunity(
          undefined as unknown as Opportunity,
        );

        expect(result).toBeUndefined();
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
        expect(handler.updates).toHaveLength(0);
      });

      it("returns the opportunity unchanged when it already has a districtId", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({ districtId: 42 });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result).toBe(opportunity);
        expect(result.districtId).toBe(42);
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
        expect(handler.updates).toHaveLength(0);
      });
    });

    describe("Standard Opportunity resolution (via Deal)", () => {
      it("assigns district from deal location when type is NOT ACCOMPANYING", async () => {
        const handler = getDistrictToOpportunityHandler();
        const district = makeDistrict({ id: 5 });
        const opportunity = makeOpportunity({
          type: OpportunityType.BREAD_DELIVERY, // Non-accompanying type
          deal: {
            location: {
              locationDistrict: [{ district }],
            },
          } as any,
        });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBe(district);
        expect(handler.updates).toContain(opportunity);
      });
    });

    describe("agent districtId resolution", () => {
      it("assigns agent.districtId to opportunity when agent has one", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          agent: { id: 10, districtId: 99 } as any,
        });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.districtId).toBe(99);
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
      });

      it("pushes opportunity to updates when agent.districtId is used", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          agent: { id: 10, districtId: 99 } as any,
        });

        await handler.addDistrictToOpportunity(opportunity);

        expect(handler.updates).toHaveLength(1);
        expect(handler.updates[0]).toBe(opportunity);
      });
    });

    describe("postcode-based district resolution", () => {
      it("calls getDistrictFromPostcode with agent address postcode", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          agent: {
            id: 10,
            address: { postcode: { value: "SW1A 1AA" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith({
          value: "SW1A 1AA",
        });
      });

      it("assigns the resolved district object to opportunity.district", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          agent: {
            id: 10,
            address: { postcode: { value: "SW1A 1AA" } },
          } as any,
        });
        const district = makeDistrict({ id: 7, name: "Westminster" });
        mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBe(district);
      });

      it("does not push to updates when getDistrictFromPostcode returns falsy", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          type: OpportunityType.ACCOMPANYING,
          agent: {
            id: 10,
            address: { postcode: { value: "UNKNOWN" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBeUndefined();
        expect(handler.updates).toHaveLength(0);
      });
    });
  });

  describe("updates tracking", () => {
    it("accumulates updates across multiple calls", async () => {
      const handler = getDistrictToOpportunityHandler();
      const o1 = makeOpportunity({
        id: 1,
        agent: { id: 10, districtId: 5 } as any,
      });
      const o2 = makeOpportunity({
        id: 2,
        agent: { id: 11, districtId: 6 } as any,
      });

      await handler.addDistrictToOpportunity(o1);
      await handler.addDistrictToOpportunity(o2);

      expect(handler.updates).toHaveLength(2);
      expect(handler.updates).toContain(o1);
      expect(handler.updates).toContain(o2);
    });
  });
});
