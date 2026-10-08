import { validate } from "class-validator";
import { ILike, Repository } from "typeorm";
import { BadRequestError, PersonAlreadyRegisteredError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import logger from "../../../logger";
import { escapeLikePattern } from "./person-name-ilike";

// Shared "look up an existing Person by email (case-insensitively) before
// creating a new, disconnected one" step used by every flow that creates a
// User without an explicit person.id (POST /, POST /user/admin,
// POST /user/register-with-invite) — e.g. a Person that already exists via
// a legacy Volunteer row (be#923).
// A Person that already has a User of any role is not re-registrable; a
// new Person is validated before being handed back, same as before this
// was shared (be#1011 review — this used to be copy-pasted, and the
// register-with-invite copy skipped the validation step entirely).
//
// `registered` is what to do when the matched Person already has a User:
// "reject" (the default, for self-service flows) or "create" a new Person
// anyway — POST /user/admin's long-standing behavior, kept when it started
// reusing an unregistered Person here (be#1012 review).
export async function resolvePersonByEmail(
  personRepository: Repository<Person>,
  email: string,
  newPersonData: Partial<Person>,
  registered: "reject" | "create" = "reject",
): Promise<Person> {
  const existingPerson = await personRepository.findOne({
    // Escaped so "_"/"%" in the address match literally, not as wildcards
    // (a_b@x.org must not pick up aXb@x.org's Person; be#1012 review).
    where: { email: ILike(escapeLikePattern(email)) },
    relations: ["users"],
  });
  if (existingPerson && !existingPerson.users?.length) {
    return existingPerson;
  }
  // Conservative default: a Person that already has a User (any role) is
  // not re-registrable — point them at login instead of silently attaching
  // a second account to the same Person.
  if (existingPerson && registered === "reject") {
    throw new PersonAlreadyRegisteredError();
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
