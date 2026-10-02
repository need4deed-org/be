import * as bcrypt from "bcrypt";
import logger from "../../logger";

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;

  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    logger.error(error, "Error hashing password");
    throw new Error("Could not hash password.");
  }
}

export async function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error(error, "Error verifying password");
    throw new Error("Could not verify password.");
  }
}
