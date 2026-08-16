import "reflect-metadata";
import * as crypto from "crypto";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { DataSource } from "typeorm";
import logger from "../../logger";
import { dataSource } from "../data-source";
import ApiKey from "../entity/api-key.entity";
import AgentPerson from "../entity/m2m/agent-person";
import Agent from "../entity/opportunity/agent.entity";
import Person from "../entity/person.entity";
import User from "../entity/user.entity";
import { hashPassword, sha256Hex } from "../utils";

// Mints a direct (non-login) API key for bot/automation access. No
// self-service endpoint yet — see be#875.
// Usage: yarn create-api-key --label <bot-label> --role <admin|coordinator|agent> [--agent-id <id>]

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.AGENT];
const USAGE =
  "Usage: yarn create-api-key --label <bot-label> --role <admin|coordinator|agent> [--agent-id <id>]";

export interface CreateApiKeyOptions {
  label: string;
  role: UserRole;
  agentId?: number;
}

export interface CreateApiKeyResult {
  rawKey: string;
  userId: number;
  agentTitle?: string;
}

export function parseArgs(argv: string[]): CreateApiKeyOptions {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index !== -1 ? argv[index + 1] : undefined;
  };

  const label = get("--label");
  const role = get("--role")?.toLowerCase() as UserRole | undefined;
  const agentIdRaw = get("--agent-id");

  if (!label || !role || !ALLOWED_ROLES.includes(role)) {
    throw new Error(USAGE);
  }

  if (role !== UserRole.AGENT) {
    return { label, role };
  }

  if (!agentIdRaw) {
    throw new Error(
      "--agent-id is required for --role agent (agent-scoped write routes require an AgentPerson membership).",
    );
  }

  const agentId = Number(agentIdRaw);
  if (!Number.isInteger(agentId) || agentId <= 0) {
    throw new Error(
      `--agent-id must be a positive integer, got "${agentIdRaw}".`,
    );
  }

  return { label, role, agentId };
}

// All writes run in one transaction: a service User (+ Person/AgentPerson
// for an agent-role key) with no corresponding ApiKey row would be an
// unrevocable, untraceable credential-less account if a crash landed
// between the individual saves.
export async function createApiKey(
  ds: DataSource,
  { label, role, agentId }: CreateApiKeyOptions,
): Promise<CreateApiKeyResult> {
  const rawKey = `n4d_${crypto.randomBytes(32).toString("hex")}`;

  const { userId, agentTitle } = await ds.transaction(async (manager) => {
    const apiKeyRepository = manager.getRepository(ApiKey);
    const agentRepository = manager.getRepository(Agent);
    const userRepository = manager.getRepository(User);
    const agentPersonRepository = manager.getRepository(AgentPerson);

    const existing = await apiKeyRepository.findOne({ where: { label } });
    if (existing) {
      throw new Error(
        `An API key with label "${label}" already exists. Revoke it first if you want to reissue.`,
      );
    }

    let agent: Agent | null = null;
    if (role === UserRole.AGENT) {
      agent = await agentRepository.findOneBy({ id: agentId });
      if (!agent) {
        throw new Error(`Agent (id:${agentId}) not found.`);
      }
    }

    // Service user never logs in via password — the password column is NOT
    // NULL, so a random, never-shared placeholder fills it rather than a
    // guessable literal. admin/coordinator keys have no Person (not scoped
    // to a center); an agent key gets a Person so it can hold the
    // AgentPerson membership agent-scoped write routes require.
    const placeholderPassword = crypto.randomBytes(32).toString("hex");
    const user = await userRepository.save(
      new User({
        email: `api-key+${label}@bots.need4deed.org`,
        password: await hashPassword(placeholderPassword),
        role,
        isActive: true,
        ...(agent ? { person: new Person({ firstName: label }) } : {}),
      }),
    );

    if (agent) {
      await agentPersonRepository.save(
        new AgentPerson({
          agentId: agent.id,
          personId: user.personId,
          role: AgentRoleType.OTHER,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
    }

    await apiKeyRepository.save(
      new ApiKey({ label, keyHash: sha256Hex(rawKey), userId: user.id }),
    );

    return { userId: user.id, agentTitle: agent?.title };
  });

  return { rawKey, userId, agentTitle };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  await dataSource.initialize();
  try {
    const { rawKey, agentTitle } = await createApiKey(dataSource, opts);
    logger.info(
      `API key "${opts.label}" created (role: ${opts.role}${agentTitle ? `, agent: "${agentTitle}"` : ""}).`,
    );
    logger.info(`Store this key now — it will not be shown again: ${rawKey}`);
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
