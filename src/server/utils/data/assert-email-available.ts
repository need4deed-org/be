import { Repository } from "typeorm";
import { ConflictError } from "../../../config";
import User from "../../../data/entity/user.entity";

// Shared "no User already owns this email" guard used by every
// User-creation route (POST /user, POST /user/admin,
// POST /user/admin/coordinator-invite, POST /user/register-with-invite) —
// this was copy-pasted four times (be#1011 review). The check is a fast
// path, not the guarantee — a concurrent duplicate falls through to the
// global error handler via the DB's unique constraint on User.email rather
// than a clean 409, the same trade-off already made everywhere this guard
// is used.
export async function assertEmailAvailable(
  userRepository: Repository<User>,
  email: string,
): Promise<void> {
  if (await userRepository.findOneBy({ email })) {
    throw new ConflictError("User with this email already exists.");
  }
}
