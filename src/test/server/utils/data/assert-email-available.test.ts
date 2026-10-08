import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "../../../../config";
import User from "../../../../data/entity/user.entity";
import {
  assertEmailAvailable,
  isPendingUser,
} from "../../../../server/utils/data/assert-email-available";

const findOneBy = vi.fn();
const userRepository: any = { findOneBy };

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
  });

  it.each(["reject", "allow"] as const)(
    "resolves when no User has the email (%s)",
    async (pending) => {
      findOneBy.mockResolvedValue(null);
      await expect(
        assertEmailAvailable(userRepository, email, pending),
      ).resolves.toBeUndefined();
    },
  );

  it.each(["reject", "allow"] as const)(
    "rejects an active or deactivated User (%s)",
    async (pending) => {
      for (const user of [activeUser, deactivatedUser]) {
        findOneBy.mockResolvedValue(user);
        await expect(
          assertEmailAvailable(userRepository, email, pending),
        ).rejects.toBeInstanceOf(ConflictError);
      }
    },
  );

  it("rejects a pending User by default", async () => {
    findOneBy.mockResolvedValue(pendingUser);
    await expect(
      assertEmailAvailable(userRepository, email),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows a pending User when asked to", async () => {
    findOneBy.mockResolvedValue(pendingUser);
    await expect(
      assertEmailAvailable(userRepository, email, "allow"),
    ).resolves.toBeUndefined();
  });
});
