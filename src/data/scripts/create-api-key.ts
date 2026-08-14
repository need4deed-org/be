import "reflect-metadata";
import * as crypto from "crypto";
import { UserRole } from "need4deed-sdk";
import { dataSource } from "../data-source";
import ApiKey from "../entity/api-key.entity";
import User from "../entity/user.entity";
import { getRepository, hashPassword } from "../utils";

// Mints a direct (non-login) API key for bot/automation access, scoped to
// the coordinator role. No self-service endpoint yet — see be#875.
// Usage: yarn create-api-key --label <bot-label>

function parseArgs(): { label: string } {
  const args = process.argv.slice(2);
  const labelIndex = args.indexOf("--label");
  const label = labelIndex !== -1 ? args[labelIndex + 1] : undefined;
  if (!label) {
    throw new Error("Usage: yarn create-api-key --label <bot-label>");
  }
  return { label };
}

async function main() {
  const { label } = parseArgs();

  await dataSource.initialize();
  try {
    const userRepository = getRepository(dataSource, User);
    const apiKeyRepository = getRepository(dataSource, ApiKey);

    const existing = await apiKeyRepository.findOne({ where: { label } });
    if (existing) {
      throw new Error(
        `An API key with label "${label}" already exists. Revoke it first if you want to reissue.`,
      );
    }

    // Service user has no Person and never logs in via password — the
    // password column is NOT NULL, so a random, never-shared placeholder
    // fills it rather than a guessable literal.
    const placeholderPassword = crypto.randomBytes(32).toString("hex");
    const user = await userRepository.save(
      new User({
        email: `api-key+${label}@bots.need4deed.org`,
        password: await hashPassword(placeholderPassword),
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
    );

    const rawKey = `n4d_${crypto.randomBytes(32).toString("hex")}`;
    await apiKeyRepository.save(
      new ApiKey({
        label,
        keyHash: await hashPassword(rawKey),
        userId: user.id,
      }),
    );

    console.log(
      `API key "${label}" created. Store it now — it will not be shown again:`,
    );
    console.log(rawKey);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
