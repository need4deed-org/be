import { validate } from "class-validator";
import { ILike, Repository } from "typeorm";
import { BadRequestError, PersonAlreadyRegisteredError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import logger from "../../../logger";

// Shared "look up an existing Person by email (case-insensitively) before
// creating a new, disconnected one" step used by every flow that creates a
// User without an explicit person.id (POST /, POST /user/register-with-invite)
// — e.g. a Person that already exists via a legacy Volunteer row (be#923).
// A Person that already has a User of any role is not re-registrable; a
// new Person is validated before being handed back, same as before this
// was shared (be#1011 review — this used to be copy-pasted, and the
// register-with-invite copy skipped the validation step entirely).
export async function resolvePersonByEmail(
  personRepository: Repository<Person>,
  email: string,
  newPersonData: Partial<Person>,
): Promise<Person> {
  const existingPerson = await personRepository.findOne({
    where: { email: ILike(email) },
    relations: ["users"],
  });
  if (existingPerson) {
    // Conservative default: a Person that already has a User (any role) is
    // not re-registrable — point them at login instead of silently
    // attaching a second account to the same Person.
    if (existingPerson.users?.length) {
      throw new PersonAlreadyRegisteredError();
    }
    return existingPerson;
  }

  const newPerson = new Person({ ...newPersonData, email });
  // target/value suppressed: a ValidationError otherwise carries the full
  // Person entity and the raw invalid value, both PII — logging that
  // unfiltered would violate "never log personal data" (be#1011 review).
  const errors = await validate(newPerson, {
    validationError: { target: false, value: false },
  });
  if (errors.length > 0) {
    logger.error(
      `New Person entity validation errors: ${JSON.stringify(errors)}`,
    );
    const messages = errors.flatMap((err) =>
      Object.values(err.constraints || {}),
    );
    throw new BadRequestError(
      `Validation failed for new person data: ${messages.join("; ")}`,
    );
  }
  return newPerson;
}
