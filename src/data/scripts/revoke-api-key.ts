import "reflect-metadata";
import { dataSource } from "../data-source";
import ApiKey from "../entity/api-key.entity";
import { getRepository } from "../utils";

// Revokes a direct (non-login) API key by label. See be#875.
// Usage: yarn revoke-api-key --label <bot-label>

function parseArgs(): { label: string } {
  const args = process.argv.slice(2);
  const labelIndex = args.indexOf("--label");
  const label = labelIndex !== -1 ? args[labelIndex + 1] : undefined;
  if (!label) {
    throw new Error("Usage: yarn revoke-api-key --label <bot-label>");
  }
  return { label };
}

async function main() {
  const { label } = parseArgs();

  await dataSource.initialize();
  try {
    const apiKeyRepository = getRepository(dataSource, ApiKey);
    const apiKey = await apiKeyRepository.findOne({ where: { label } });
    if (!apiKey) {
      throw new Error(`No API key found with label "${label}".`);
    }
    if (apiKey.revokedAt) {
      console.log(`API key "${label}" is already revoked.`);
      return;
    }

    apiKey.revokedAt = new Date();
    await apiKeyRepository.save(apiKey);
    console.log(`API key "${label}" revoked.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
