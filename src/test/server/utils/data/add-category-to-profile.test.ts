/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Deal from "../../../../data/entity/deal.entity";
import { categorize } from "../../../../data/lib";
import { getCategoryToDealHandler } from "../../../../server/utils";

vi.mock("../../../../data/lib", () => ({
  categorize: vi.fn(),
}));

const mockedCategorize = vi.mocked(categorize);

function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 1,
    categoryId: undefined,
    dealActivity: [],
    ...overrides,
  } as Deal;
}

describe("getCategoryToDealHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addCategoryToDeal", () => {
    it("returns the deal unchanged when it already has a categoryId", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ categoryId: 100 });

      const result = handler.addCategoryToDeal(deal);

      expect(result).toBe(deal);
      expect(result.categoryId).toBe(100);
      expect(mockedCategorize).not.toHaveBeenCalled();
    });

    it("calls categorize with activity categoryIds from dealActivity", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({
        dealActivity: [
          { activity: { categoryId: 100 } },
          { activity: { categoryId: 200 } },
        ] as any,
      });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToDeal(deal);

      expect(mockedCategorize).toHaveBeenCalledWith([100, 200]);
    });

    it("calls categorize with an empty array when dealActivity is absent", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: undefined as any });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToDeal(deal);

      expect(mockedCategorize).toHaveBeenCalledWith([]);
    });

    it("calls categorize with an empty array when dealActivity is empty", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: [] });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToDeal(deal);

      expect(mockedCategorize).toHaveBeenCalledWith([]);
    });

    it("assigns the categoryId returned by categorize and returns the mutated deal", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: [] });
      mockedCategorize.mockReturnValue(300);

      const result = handler.addCategoryToDeal(deal);

      expect(result).toBe(deal); // same reference — Object.assign mutates in place
      expect(result.categoryId).toBe(300);
    });

    it("returns the deal unchanged when categorize returns falsy", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: [] });
      mockedCategorize.mockReturnValue(undefined);

      const result = handler.addCategoryToDeal(deal);

      expect(result).toBe(deal);
      expect(result.categoryId).toBeUndefined();
    });
  });

  describe("updates tracking", () => {
    it("starts with an empty updates array", () => {
      const handler = getCategoryToDealHandler();
      expect(handler.updates).toEqual([]);
    });

    it("adds a deal to updates when categorize resolves a categoryId", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: [] });
      mockedCategorize.mockReturnValue(300);

      handler.addCategoryToDeal(deal);

      expect(handler.updates).toHaveLength(1);
      expect(handler.updates[0]).toBe(deal);
    });

    it("does not add to updates when deal already has a categoryId", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ categoryId: 200 });

      handler.addCategoryToDeal(deal);

      expect(handler.updates).toHaveLength(0);
    });

    it("does not add to updates when categorize returns falsy", () => {
      const handler = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: [] });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToDeal(deal);

      expect(handler.updates).toHaveLength(0);
    });

    it("accumulates multiple deals across calls", () => {
      const handler = getCategoryToDealHandler();
      const d1 = makeDeal({ id: 1000, dealActivity: [] });
      const d2 = makeDeal({ id: 2000, dealActivity: [] });
      mockedCategorize.mockReturnValue(300);

      handler.addCategoryToDeal(d1);
      handler.addCategoryToDeal(d2);

      expect(handler.updates).toHaveLength(2);
      expect(handler.updates).toContain(d1);
      expect(handler.updates).toContain(d2);
    });

    it("each handler instance has its own independent updates array", () => {
      const h1 = getCategoryToDealHandler();
      const h2 = getCategoryToDealHandler();
      const deal = makeDeal({ dealActivity: [] });
      mockedCategorize.mockReturnValue(300);

      h1.addCategoryToDeal(deal);

      expect(h1.updates).toHaveLength(1);
      expect(h2.updates).toHaveLength(0);
    });
  });
});
