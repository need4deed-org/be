import { validate } from "class-validator";
import { ILike, Repository } from "typeorm";
import { BadRequestError, PersonAlreadyRegisteredError } from "../../../config";
import Person from "../../../data/entity/person.entity";
import logger from "../../../logger";

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
    if (existingPerson.users?.length) {
      throw new PersonAlreadyRegisteredError();
    }
    return existingPerson;
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
