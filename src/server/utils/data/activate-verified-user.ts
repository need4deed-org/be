import { randomBytes } from "crypto";
import { EntityManager } from "typeorm";
import { AlreadyUsedTokenError, BadRequestError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import {
  findPersonByEmail,
  isUnclaimedPerson,
} from "./resolve-person-by-email";

export interface ActivateVerifiedUserResult {
  user: User;
  linkedExistingPerson: boolean;
}

async function hasPreexistingPerson(
  tx: EntityManager,
  user: User,
): Promise<boolean> {
  if (!user.personId) {
    return false;
  }
  const person = await tx.findOneBy(Person, { id: user.personId });
  return !!person && person.createdAt < user.createdAt;
}

async function linkPersonByEmail(
  tx: EntityManager,
  user: User,
): Promise<boolean> {
  const existing = await findPersonByEmail(
    tx.getRepository(Person),
    user.email,
  );
  if (isUnclaimedPerson(existing)) {
    user.personId = existing.id;
    return true;
  }
  const person = await tx.save(
    Person,
    new Person({ firstName: user.email.split("@")[0], email: user.email }),
  );
  user.personId = person.id;
  logger.warn(
    `No unclaimed person for user ${user.id} on verification; created empty person ${person.id}`,
  );
  return false;
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

    const linkedExistingPerson = user.personId
      ? await hasPreexistingPerson(tx, user)
      : await linkPersonByEmail(tx, user);
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
        personId: user.personId,
        ...(linkedExistingPerson ? { password: user.password } : {}),
      },
    );
    return { user, linkedExistingPerson };
  });
}
