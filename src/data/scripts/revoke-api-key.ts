import "reflect-metadata";
import { DataSource } from "typeorm";
import logger from "../../logger";
import { dataSource } from "../data-source";
import ApiKey from "../entity/api-key.entity";
import { getRepository } from "../utils";

// Revokes a direct (non-login) API key by label. See be#875.
// Usage: yarn revoke-api-key --label <bot-label>

export interface RevokeApiKeyOptions {
  label: string;
}

export interface RevokeApiKeyResult {
  alreadyRevoked: boolean;
}

export function parseArgs(argv: string[]): RevokeApiKeyOptions {
  const index = argv.indexOf("--label");
  const label = index !== -1 ? argv[index + 1] : undefined;
  if (!label) {
    throw new Error("Usage: yarn revoke-api-key --label <bot-label>");
  }
  return { label };
}

export async function revokeApiKey(
  ds: DataSource,
  { label }: RevokeApiKeyOptions,
): Promise<RevokeApiKeyResult> {
  const apiKeyRepository = getRepository(ds, ApiKey);
  const apiKey = await apiKeyRepository.findOne({ where: { label } });
  if (!apiKey) {
    throw new Error(`No API key found with label "${label}".`);
  }
  if (apiKey.revokedAt) {
    return { alreadyRevoked: true };
  }

  apiKey.revokedAt = new Date();
  await apiKeyRepository.save(apiKey);
  return { alreadyRevoked: false };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  await dataSource.initialize();
  try {
    const { alreadyRevoked } = await revokeApiKey(dataSource, opts);
    logger.info(
      alreadyRevoked
        ? `API key "${opts.label}" is already revoked.`
        : `API key "${opts.label}" revoked.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
