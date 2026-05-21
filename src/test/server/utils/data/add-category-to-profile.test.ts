/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    profileActivity: [],
    ...overrides,
  } as Profile;
}

describe("getCategoryToProfileHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addCategoryToProfile", () => {
    it("returns the profile unchanged when it already has a categoryId", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ categoryId: 100 });

      const result = handler.addCategoryToProfile(profile);

      expect(result).toBe(profile);
      expect(result.categoryId).toBe(100);
      expect(mockedCategorize).not.toHaveBeenCalled();
    });

    it("calls categorize with activity categoryIds from profileActivity", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({
        profileActivity: [
          { activity: { categoryId: 100 } },
          { activity: { categoryId: 200 } },
        ] as any,
      });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(profile);

      expect(mockedCategorize).toHaveBeenCalledWith([100, 200]);
    });

    it("calls categorize with an empty array when profileActivity is absent", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ profileActivity: undefined as any });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(profile);

      expect(mockedCategorize).toHaveBeenCalledWith([]);
    });

    it("calls categorize with an empty array when profileActivity is empty", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ profileActivity: [] });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(profile);

      expect(mockedCategorize).toHaveBeenCalledWith([]);
    });

    it("assigns the categoryId returned by categorize and returns the mutated profile", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ profileActivity: [] });
      mockedCategorize.mockReturnValue(300);

      const result = handler.addCategoryToProfile(profile);

      expect(result).toBe(profile); // same reference — Object.assign mutates in place
      expect(result.categoryId).toBe(300);
    });

    it("returns the profile unchanged when categorize returns falsy", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ profileActivity: [] });
      mockedCategorize.mockReturnValue(undefined);

      const result = handler.addCategoryToProfile(profile);

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
      const profile = makeProfile({ profileActivity: [] });
      mockedCategorize.mockReturnValue(300);

      handler.addCategoryToProfile(profile);

      expect(handler.updates).toHaveLength(1);
      expect(handler.updates[0]).toBe(profile);
    });

    it("does not add to updates when profile already has a categoryId", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ categoryId: 200 });

      handler.addCategoryToProfile(profile);

      expect(handler.updates).toHaveLength(0);
    });

    it("does not add to updates when categorize returns falsy", () => {
      const handler = getCategoryToProfileHandler();
      const profile = makeProfile({ profileActivity: [] });
      mockedCategorize.mockReturnValue(undefined);

      handler.addCategoryToProfile(profile);

      expect(handler.updates).toHaveLength(0);
    });

    it("accumulates multiple profiles across calls", () => {
      const handler = getCategoryToProfileHandler();
      const p1 = makeProfile({ id: 1000, profileActivity: [] });
      const p2 = makeProfile({ id: 2000, profileActivity: [] });
      mockedCategorize.mockReturnValue(300);

      handler.addCategoryToProfile(p1);
      handler.addCategoryToProfile(p2);

      expect(handler.updates).toHaveLength(2);
      expect(handler.updates).toContain(p1);
      expect(handler.updates).toContain(p2);
    });

    it("each handler instance has its own independent updates array", () => {
      const h1 = getCategoryToProfileHandler();
      const h2 = getCategoryToProfileHandler();
      const profile = makeProfile({ profileActivity: [] });
      mockedCategorize.mockReturnValue(300);

      h1.addCategoryToProfile(profile);

      expect(h1.updates).toHaveLength(1);
      expect(h2.updates).toHaveLength(0);
    });
  });
});
