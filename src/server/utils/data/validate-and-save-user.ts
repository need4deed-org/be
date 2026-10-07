import { validate } from "class-validator";
import { Repository } from "typeorm";
import User from "../../../data/entity/user.entity";
import logger from "../../../logger";

export type ValidateAndSaveUserResult =
  | { status: "ok"; user: User }
  | { status: "error"; errors: string[] };

export async function validateAndSaveUser(
  userRepository: Repository<User>,
  newUser: User,
): Promise<ValidateAndSaveUserResult> {
  const errors = await validate(newUser, {
    validationError: { target: false, value: false },
  });
  if (errors.length > 0) {
    logger.error(`User entity validation errors: ${JSON.stringify(errors)}`);
    return {
      status: "error",
      errors: errors.flatMap((err) => Object.values(err.constraints || {})),
    };
  }

  const user = await userRepository.save(newUser);
  return { status: "ok", user };
}
