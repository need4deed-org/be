import { Repository } from "typeorm";
import { ConflictError } from "../../../config";
import User from "../../../data/entity/user.entity";

// global error handler via the DB's unique constraint on User.email rather
export async function assertEmailAvailable(
  userRepository: Repository<User>,
  email: string,
): Promise<void> {
  if (await userRepository.findOneBy({ email })) {
    throw new ConflictError("User with this email already exists.");
  }
}
