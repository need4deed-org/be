import { EntityManager, IsNull, Repository } from "typeorm";
import { ConflictError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { isPersonReferenced } from "./is-person-referenced";
import {
  validateAndSaveUser,
  ValidateAndSaveUserResult,
} from "./validate-and-save-user";

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
  manager: EntityManager,
  email: string,
  keepPersonId?: number,
): Promise<void> {
  const existing = await manager.findOne(User, {
    where: { email },
    relations: ["person"],
  });
  if (!existing || !isPendingUser(existing)) {
    return;
  }

  const { affected } = await manager.delete(User, {
    id: existing.id,
    isActive: false,
    deactivatedAt: IsNull(),
  });
  const person = existing.person;
  if (
    affected &&
    person &&
    person.id !== keepPersonId &&
    // an older Person was reused by the pending User, not created with it
    person.createdAt >= existing.createdAt &&
    !(await isPersonReferenced(manager, person.id))
  ) {
    await manager.delete(Person, { id: person.id });
  }
}

class RollbackWithErrors {
  constructor(readonly errors: string[]) {}
}

export async function createUserReclaimingEmail(
  manager: EntityManager,
  email: string,
  buildUser: (manager: EntityManager) => Promise<User>,
  keepPersonId?: number,
): Promise<ValidateAndSaveUserResult> {
  try {
    return await manager.transaction(async (tx) => {
      await reclaimPendingUser(tx, email, keepPersonId);
      const newUser = await buildUser(tx);
      const userRepository = tx.getRepository(User);
      await assertEmailAvailable(userRepository, email);
      const result = await validateAndSaveUser(userRepository, newUser);
      if (result.status === "error") {
        throw new RollbackWithErrors(result.errors);
      }
      return result;
    });
  } catch (err) {
    if (err instanceof RollbackWithErrors) {
      return { status: "error", errors: err.errors };
    }
    throw err;
  }
}
