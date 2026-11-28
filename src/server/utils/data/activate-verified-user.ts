import { randomBytes } from "crypto";
import { EntityManager, IsNull } from "typeorm";
import { AlreadyUsedTokenError, BadRequestError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import { deletePersonIfCreatedWith } from "./assert-email-available";
import {
  findPersonsByEmail,
  isUnclaimedPerson,
} from "./resolve-person-by-email";

export interface ActivateVerifiedUserResult {
  user: User;
  linkedExistingPerson: boolean;
}

async function claimUnclaimedPerson(
  tx: EntityManager,
  email: string,
): Promise<Person | null> {
  const candidates = await findPersonsByEmail(tx.getRepository(Person), email);
  for (const candidate of candidates.filter(isUnclaimedPerson)) {
    const locked = await tx.findOne(Person, {
      where: { id: candidate.id },
      lock: { mode: "pessimistic_write" },
    });
    if (locked && !(await tx.countBy(User, { personId: locked.id }))) {
      return locked;
    }
  }
  return null;
}

async function swapInUnclaimedPerson(
  tx: EntityManager,
  user: User,
  registrationPerson: Person | null,
): Promise<boolean> {
  const unclaimed = await claimUnclaimedPerson(tx, user.email);
  if (!unclaimed) {
    if (registrationPerson) {
      await tx.update(
        Person,
        { id: registrationPerson.id, email: IsNull() },
        { email: user.email },
      );
    }
    return false;
  }
  user.personId = unclaimed.id;
  await tx.update(User, { id: user.id }, { personId: unclaimed.id });
  if (registrationPerson) {
    await deletePersonIfCreatedWith(tx, registrationPerson, user);
  }
  return true;
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

    const person = user.personId
      ? await tx.findOneBy(Person, { id: user.personId })
      : null;
    // a Person older than the user and holding its email was reused, not created with it
    const holdsOlderPerson =
      !!person &&
      person.createdAt < user.createdAt &&
      person.email?.toLowerCase() === user.email.toLowerCase();
    const linkedExistingPerson =
      holdsOlderPerson || (await swapInUnclaimedPerson(tx, user, person));

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
