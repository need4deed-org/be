import { randomBytes } from "crypto";
import { EntityManager } from "typeorm";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import logger from "../../../logger";
import {
  findPersonByEmail,
  isUnclaimedPerson,
} from "./resolve-person-by-email";

export interface ActivateVerifiedUserResult {
  linkedExistingPerson: boolean;
}

// keep credentialsValidAfter: the registration "complete" step authenticates with the verify token
export async function activateVerifiedUser(
  manager: EntityManager,
  user: User,
): Promise<ActivateVerifiedUserResult> {
  return manager.transaction(async (tx) => {
    let linkedExistingPerson = false;
    if (!user.personId) {
      const existing = await findPersonByEmail(
        tx.getRepository(Person),
        user.email,
      );
      if (isUnclaimedPerson(existing)) {
        user.personId = existing.id;
        user.password = await hashPassword(randomBytes(32).toString("hex"));
        linkedExistingPerson = true;
        logger.info(
          `Existing person ${existing.id} linked to user ${user.id} on verification; registration password discarded`,
        );
      } else {
        const person = await tx.save(
          Person,
          new Person({
            firstName: user.email.split("@")[0],
            email: user.email,
          }),
        );
        user.personId = person.id;
        logger.warn(
          `No unclaimed person for user ${user.id} on verification; created empty person ${person.id}`,
        );
      }
    }
    await tx.update(
      User,
      { id: user.id },
      {
        isActive: true,
        personId: user.personId,
        ...(linkedExistingPerson ? { password: user.password } : {}),
      },
    );
    user.isActive = true;
    return { linkedExistingPerson };
  });
}
