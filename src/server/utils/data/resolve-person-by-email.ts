import { validate } from "class-validator";
import { ILike, Repository } from "typeorm";
import { BadRequestError, PersonAlreadyRegisteredError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import logger from "../../../logger";
import { escapeLikePattern } from "./person-name-ilike";

export function findPersonByEmail(
  personRepository: Repository<Person>,
  email: string,
): Promise<Person | null> {
  return personRepository.findOne({
    where: { email: ILike(escapeLikePattern(email)) },
    relations: ["users"],
  });
}

export function isUnclaimedPerson(person: Person | null): person is Person {
  return !!person && !person.users?.length;
}

async function buildNewPerson(
  newPersonData: Partial<Person>,
  email: string,
): Promise<Person> {
  const newPerson = new Person({ ...newPersonData, email });
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

export async function resolvePersonByEmail(
  personRepository: Repository<Person>,
  email: string,
  newPersonData: Partial<Person>,
  registered: "reject" | "create" = "reject",
): Promise<Person> {
  const existingPerson = await findPersonByEmail(personRepository, email);
  if (isUnclaimedPerson(existingPerson)) {
    return existingPerson;
  }
  if (existingPerson && registered === "reject") {
    throw new PersonAlreadyRegisteredError();
  }
  return buildNewPerson(newPersonData, email);
}

// the email is unproven until verify-email, which links an unclaimed Person
export async function resolveSelfRegistrationPerson(
  personRepository: Repository<Person>,
  email: string,
  newPersonData: Partial<Person>,
): Promise<Person | null> {
  const existingPerson = await findPersonByEmail(personRepository, email);
  if (isUnclaimedPerson(existingPerson)) {
    return null;
  }
  if (existingPerson) {
    throw new PersonAlreadyRegisteredError();
  }
  return buildNewPerson(newPersonData, email);
}
