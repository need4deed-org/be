import { IsNull, Repository } from "typeorm";
import { ConflictError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { isPersonReferenced } from "./is-person-referenced";

export type PendingUserPolicy = "reject" | "allow";

export function isPendingUser(user: User): boolean {
  return !user.isActive && !user.deactivatedAt;
}

export async function assertEmailAvailable(
  userRepository: Repository<User>,
  email: string,
  pending: PendingUserPolicy = "reject",
): Promise<void> {
  const existing = await userRepository.findOneBy({ email });
  if (existing && (pending === "reject" || !isPendingUser(existing))) {
    throw new ConflictError("User with this email already exists.");
  }
}

export async function reclaimPendingUser(
  userRepository: Repository<User>,
  email: string,
  keepPersonId?: number,
): Promise<void> {
  const existing = await userRepository.findOneBy({ email });
  if (!existing || !isPendingUser(existing)) {
    return;
  }

  await userRepository.manager.transaction(async (manager) => {
    const { affected } = await manager.delete(User, {
      id: existing.id,
      isActive: false,
      deactivatedAt: IsNull(),
    });
    if (
      affected &&
      existing.personId &&
      existing.personId !== keepPersonId &&
      !(await isPersonReferenced(manager, existing.personId))
    ) {
      await manager.delete(Person, { id: existing.personId });
    }
  });
}
