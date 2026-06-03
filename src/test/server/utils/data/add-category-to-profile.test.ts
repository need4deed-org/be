/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Deal from "../../../../data/entity/deal.entity";
import type DealActivity from "../../../../data/entity/m2m/deal-activity";
import type Profile from "../../../../data/entity/profile/profile.entity";
import { categorize } from "../../../../data/lib";
import { getCategoryToProfileHandler } from "../../../../server/utils";

vi.mock("../../../../data/lib", () => ({
  categorize: vi.fn(),
}));

const mockedCategorize = vi.mocked(categorize);

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    categoryId: undefined,
    ...overrides,
  } as Profile;
}

// Activities now live on the Deal (deal.dealActivity); category is still
// derived from them but stored on deal.profile.
function makeDeal(
  profile: Profile,
  dealActivity?: Partial<DealActivity>[],
): Deal {
  return { profile, dealActivity } as Deal;
}

describe("getCategoryToProfileHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addCategoryToProfile", () => {
    it("returns the profile unchanged when it already has a categoryId", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ categoryId: 100 });

      const result = handler.addCategoryToProfile(makeDeal(profile, []));

      expect(result).toBe(profile);
      expect(result.categoryId).toBe(100);
      expect(mockedCategorize).not.toHaveBeenCalled();
    });

    it("calls categorize with activity categoryIds from dealActivity", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      const deal = makeDeal(profile, [
        { activity: { categoryId: 100 } },
        { activity: { categoryId: 200 } },
      ] as any);
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(deal);

      expect(mockedCategorize).toHaveBeenCalledWith([100, 200]);
    });

    it("calls categorize with an empty array when dealActivity is absent", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(makeDeal(profile, undefined));

      expect(mockedCategorize).toHaveBeenCalledWith([]);
    });

    it("calls categorize with an empty array when dealActivity is empty", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(makeDeal(profile, []));

      expect(mockedCategorize).toHaveBeenCalledWith([]);
    });

    it("assigns the categoryId returned by categorize and returns the mutated profile", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(300);

      const result = handler.addCategoryToProfile(makeDeal(profile, []));

      expect(result).toBe(profile); // same reference — Object.assign mutates in place
      expect(result.categoryId).toBe(300);
    });

    it("returns the profile unchanged when categorize returns falsy", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(undefined);

      const result = handler.addCategoryToProfile(makeDeal(profile, []));

      expect(result).toBe(profile);
      expect(result.categoryId).toBeUndefined();
    });
  });

  describe("updates tracking", () => {
    it("starts with an empty updates array", () => {
      const handler = getCategoryToProfileHandler();
      expect(handler.updates).toEqual([]);
    });

    it("adds a profile to updates when categorize resolves a categoryId", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(300);

      handler.addCategoryToProfile(makeDeal(profile, []));

      expect(handler.updates).toHaveLength(1);
      expect(handler.updates[0]).toBe(profile);
    });

    it("does not add to updates when profile already has a categoryId", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ categoryId: 200 });

      handler.addCategoryToProfile(makeDeal(profile, []));

      expect(handler.updates).toHaveLength(0);
    });

    it("does not add to updates when categorize returns falsy", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(makeDeal(profile, []));

      expect(handler.updates).toHaveLength(0);
    });

    it("accumulates multiple profiles across calls", () => {
      const handler = getCategoryToProfileHandler();
      const p1 = makeProfile({ id: 1000 });
      const p2 = makeProfile({ id: 2000 });
      mockedCategorize.mockReturnValue(300);

      handler.addCategoryToProfile(makeDeal(p1, []));
      handler.addCategoryToProfile(makeDeal(p2, []));

      expect(handler.updates).toHaveLength(2);
      expect(handler.updates).toContain(p1);
      expect(handler.updates).toContain(p2);
    });

    it("each handler instance has its own independent updates array", () => {
      const h1 = getCategoryToProfileHandler();
      const h2 = getCategoryToProfileHandler();
      const profile = makeProfile();
      mockedCategorize.mockReturnValue(300);

      h1.addCategoryToProfile(makeDeal(profile, []));

      expect(h1.updates).toHaveLength(1);
      expect(h2.updates).toHaveLength(0);
    });
  });
});
