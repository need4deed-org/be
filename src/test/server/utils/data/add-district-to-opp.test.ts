/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Opportunity from "../../../../data/entity/opportunity/opportunity.entity";
import { getDistrictFromPostcode } from "../../../../data/utils/get-district";
import { getDistrictToOpportunityHandler } from "../../../../server/utils";

vi.mock("../../../../data/utils/get-district", () => ({
  getDistrictFromPostcode: vi.fn(),
}));

const mockedGetDistrictFromPostcode = vi.mocked(getDistrictFromPostcode);

// Adjust field types to match your actual entities
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function makeOpportunity(
  overrides: DeepPartial<Opportunity> = {},
): Opportunity {
  return {
    id: 1,
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

    describe("agent districtId resolution", () => {
      it("assigns agent.districtId to opportunity when agent has one", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: { id: 10, districtId: 99 },
        });

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result).toBe(opportunity);
        expect(result.districtId).toBe(99);
        expect(mockedGetDistrictFromPostcode).not.toHaveBeenCalled();
      });

      it("pushes opportunity to updates when agent.districtId is used", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
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
          agent: {
            id: 10,
            districtId: undefined,
            address: { postcode: { value: "SW1A 1AA" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith({
          value: "SW1A 1AA",
        });
      });

      it("calls getDistrictFromPostcode with undefined when agent has no address", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: { id: 10, districtId: undefined!, address: undefined! } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith(undefined);
      });

      it("calls getDistrictFromPostcode with undefined when agent is absent", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({ agent: undefined });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        await handler.addDistrictToOpportunity(opportunity);

        expect(mockedGetDistrictFromPostcode).toHaveBeenCalledWith(undefined);
      });

      it("assigns the resolved district object to opportunity.district", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: {
            id: 10,
            districtId: undefined!,
            address: { postcode: { value: "SW1A 1AA" } },
          } as any,
        });
        const district = makeDistrict({ id: 7, name: "Westminster" });
        mockedGetDistrictFromPostcode.mockResolvedValue(district as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.district).toBe(district);
      });

      it("does NOT assign districtId when resolving via postcode (sets district object only)", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: {
            id: 10,
            districtId: undefined!,
            address: { postcode: { value: "SW1A 1AA" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(makeDistrict() as any);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result.districtId).toBeUndefined();
      });

      it("pushes opportunity to updates when district resolves from postcode", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: {
            id: 10,
            districtId: undefined,
            address: { postcode: { value: "SW1A 1AA" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(makeDistrict() as any);

        await handler.addDistrictToOpportunity(opportunity);

        expect(handler.updates).toHaveLength(1);
        expect(handler.updates[0]).toBe(opportunity);
      });

      it("does not push to updates when getDistrictFromPostcode returns falsy", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: {
            id: 10,
            districtId: undefined,
            address: { postcode: { value: "UNKNOWN" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result).toBe(opportunity);
        expect(result.district).toBeUndefined();
        expect(handler.updates).toHaveLength(0);
      });

      it("returns the opportunity even when getDistrictFromPostcode returns falsy", async () => {
        const handler = getDistrictToOpportunityHandler();
        const opportunity = makeOpportunity({
          agent: {
            id: 10,
            districtId: undefined,
            address: { postcode: { value: "UNKNOWN" } },
          } as any,
        });
        mockedGetDistrictFromPostcode.mockResolvedValue(undefined!);

        const result = await handler.addDistrictToOpportunity(opportunity);

        expect(result).toBe(opportunity);
      });
    });
  });

  describe("updates tracking", () => {
    it("starts with an empty updates array", () => {
      const handler = getDistrictToOpportunityHandler();
      expect(handler.updates).toEqual([]);
    });

    it("accumulates updates across multiple calls", async () => {
      const handler = getDistrictToOpportunityHandler();
      const o1 = makeOpportunity({
        id: 1,
        agent: { id: 10, districtId: 5 },
      } as any);
      const o2 = makeOpportunity({
        id: 2,
        agent: { id: 11, districtId: 6 },
      } as any);

      await handler.addDistrictToOpportunity(o1);
      await handler.addDistrictToOpportunity(o2);

      expect(handler.updates).toHaveLength(2);
      expect(handler.updates).toContain(o1);
      expect(handler.updates).toContain(o2);
    });

    it("each handler instance has its own independent updates array", async () => {
      const h1 = getDistrictToOpportunityHandler();
      const h2 = getDistrictToOpportunityHandler();
      const opportunity = makeOpportunity({
        agent: { id: 10, districtId: 5 },
      } as any);

      await h1.addDistrictToOpportunity(opportunity);

      expect(h1.updates).toHaveLength(1);
      expect(h2.updates).toHaveLength(0);
    });
  });
});
