import { IsNull } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../../config";
import User from "../../../../data/entity/user.entity";
import {
  assertEmailAvailable,
  isPendingUser,
} from "../../../../server/utils/data/assert-email-available";

const findOneBy = vi.fn();
const deleteFn = vi.fn();
const userRepository: any = { findOneBy, delete: deleteFn };

const email = "someone@example.org";
const pendingUser = new User({ id: 7, isActive: false, deactivatedAt: null });
const activeUser = new User({ id: 8, isActive: true, deactivatedAt: null });
const deactivatedUser = new User({
  id: 9,
  isActive: false,
  deactivatedAt: new Date(),
});

describe("isPendingUser", () => {
  it("is true only for an inactive, never-deactivated User", () => {
    expect(isPendingUser(pendingUser)).toBe(true);
    expect(isPendingUser(activeUser)).toBe(false);
    expect(isPendingUser(deactivatedUser)).toBe(false);
  });
});

describe("assertEmailAvailable", () => {
  beforeEach(() => {
    findOneBy.mockReset();
    deleteFn.mockReset();
  });

  it.each(["reject", "allow", "reclaim"] as const)(
    "resolves when no User has the email (%s)",
    async (pending) => {
      findOneBy.mockResolvedValue(null);
      await expect(
        assertEmailAvailable(userRepository, email, pending),
      ).resolves.toBeUndefined();
      expect(deleteFn).not.toHaveBeenCalled();
    },
  );

  it.each(["reject", "allow", "reclaim"] as const)(
    "rejects an active or deactivated User (%s)",
    async (pending) => {
      for (const user of [activeUser, deactivatedUser]) {
        findOneBy.mockResolvedValue(user);
        await expect(
          assertEmailAvailable(userRepository, email, pending),
        ).rejects.toBeInstanceOf(ConflictError);
      }
      expect(deleteFn).not.toHaveBeenCalled();
    },
  );

  it("rejects a pending User by default", async () => {
    findOneBy.mockResolvedValue(pendingUser);
    await expect(
      assertEmailAvailable(userRepository, email),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("allows a pending User without deleting it", async () => {
    findOneBy.mockResolvedValue(pendingUser);
    await expect(
      assertEmailAvailable(userRepository, email, "allow"),
    ).resolves.toBeUndefined();
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("reclaims a pending User by deleting it, guarded on still being pending", async () => {
    findOneBy.mockResolvedValue(pendingUser);
    deleteFn.mockResolvedValue({ affected: 1 });
    await expect(
      assertEmailAvailable(userRepository, email, "reclaim"),
    ).resolves.toBeUndefined();
    expect(deleteFn).toHaveBeenCalledWith({
      id: pendingUser.id,
      isActive: false,
      deactivatedAt: IsNull(),
    });
  });

  it("rejects when the pending User changed before it could be reclaimed", async () => {
    findOneBy.mockResolvedValue(pendingUser);
    deleteFn.mockResolvedValue({ affected: 0 });
    await expect(
      assertEmailAvailable(userRepository, email, "reclaim"),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
