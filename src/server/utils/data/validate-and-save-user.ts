import { validate } from "class-validator";
import { Repository } from "typeorm";
import User from "../../../data/entity/user.entity";
import logger from "../../../logger";

// A string-literal `status` discriminant, not a boolean `ok` one — this
// TypeScript config's control-flow narrowing doesn't discriminate a
// `{ok:true}|{ok:false}` union (confirmed in isolation; a `"ok"|"error"`
// string-literal union narrows correctly).
export type ValidateAndSaveUserResult =
  | { status: "ok"; user: User }
  | { status: "error"; errors: string[] };

// Shared "validate the User entity, save it, or collect its errors" step
// used by every User-creation route (POST /user, POST /user/admin,
// POST /user/register-with-invite) — that part was copy-pasted three times;
// each route still builds its own reply/side effects around the result
// (be#1008 review).
export async function validateAndSaveUser(
  userRepository: Repository<User>,
  newUser: User,
): Promise<ValidateAndSaveUserResult> {
  const errors = await validate(newUser);
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
