import { randomBytes } from "crypto";
import { EntityManager } from "typeorm";
import { AlreadyUsedTokenError, BadRequestError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import { isPersonReferenced } from "./is-person-referenced";
import {
  findPersonByEmail,
  isUnclaimedPerson,
} from "./resolve-person-by-email";

export interface ActivateVerifiedUserResult {
  user: User;
  linkedExistingPerson: boolean;
}

async function swapInUnclaimedPerson(
  tx: EntityManager,
  user: User,
): Promise<boolean> {
  const unclaimed = await findPersonByEmail(
    tx.getRepository(Person),
    user.email,
  );
  if (!isUnclaimedPerson(unclaimed) || unclaimed.id === user.personId) {
    return false;
  }
  const registrationPersonId = user.personId;
  user.personId = unclaimed.id;
  await tx.update(User, { id: user.id }, { personId: unclaimed.id });
  if (
    registrationPersonId &&
    !(await isPersonReferenced(tx, registrationPersonId))
  ) {
    await tx.delete(Person, { id: registrationPersonId });
  }
  return true;
}

// a pending user from before verify-time linking may already hold an older Person
async function holdsOlderPerson(
  tx: EntityManager,
  user: User,
): Promise<boolean> {
  if (!user.personId) {
    return false;
  }
  const person = await tx.findOneBy(Person, { id: user.personId });
  return !!person && person.createdAt < user.createdAt;
}

// keep credentialsValidAfter: the registration "complete" step authenticates with the verify token
export async function activateVerifiedUser(
  manager: EntityManager,
  userId: number,
): Promise<ActivateVerifiedUserResult> {
  return manager.transaction(async (tx) => {
    const user = await tx.findOne(User, {
      where: { id: userId },
      lock: { mode: "pessimistic_write" },
    });
    if (!user) {
      throw new BadRequestError("Invalid token.");
    }
    if (user.isActive) {
      throw new AlreadyUsedTokenError();
    }
    if (user.deactivatedAt) {
      throw new BadRequestError("Account has been deactivated.");
    }

    const linkedExistingPerson =
      (await swapInUnclaimedPerson(tx, user)) ||
      (await holdsOlderPerson(tx, user));
    if (linkedExistingPerson) {
      user.password = await hashPassword(randomBytes(32).toString("hex"));
      logger.info(
        `Existing person ${user.personId} linked to user ${user.id}; registration password discarded`,
      );
    }
    user.isActive = true;
    await tx.update(
      User,
      { id: user.id },
      {
        isActive: true,
        ...(linkedExistingPerson ? { password: user.password } : {}),
      },
    );
    return { user, linkedExistingPerson };
  });
}
