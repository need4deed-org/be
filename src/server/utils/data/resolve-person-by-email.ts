import { validate } from "class-validator";
import { ILike, Repository } from "typeorm";
import { BadRequestError, PersonAlreadyRegisteredError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import logger from "../../../logger";
import { escapeLikePattern } from "./person-name-ilike";

export async function resolvePersonByEmail(
  personRepository: Repository<Person>,
  email: string,
  newPersonData: Partial<Person>,
  registered: "reject" | "create" = "reject",
): Promise<Person> {
  const existingPerson = await personRepository.findOne({
    where: { email: ILike(escapeLikePattern(email)) },
    relations: ["users"],
  });
  if (existingPerson && !existingPerson.users?.length) {
    return existingPerson;
  }
  if (existingPerson && registered === "reject") {
    throw new PersonAlreadyRegisteredError();
  }

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
