import * as bcrypt from "bcrypt";

/**
 * Hashes a plain-text password using bcrypt.
 * @param password The plain-text password to hash.
 * @returns A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10; // 10 rounds is a good default for bcrypt

  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Could not hash password.");
  }
}

/**
 * Compares a plain-text password with a hashed password.
 * @param plainTextPassword The password provided by the user during login.
 * @param hashedPassword The hash retrieved from the database.
 * @returns A promise that resolves to true if the passwords match, false otherwise.
 */
export async function verifyPassword(
  plainTextPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error("Error verifying password:", error);
    throw new Error("Could not verify password.");
  }
}
