import "reflect-metadata";
import * as crypto from "crypto";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { dataSource } from "../data-source";
import ApiKey from "../entity/api-key.entity";
import AgentPerson from "../entity/m2m/agent-person";
import Agent from "../entity/opportunity/agent.entity";
import Person from "../entity/person.entity";
import User from "../entity/user.entity";
import { getRepository, hashPassword } from "../utils";

// Mints a direct (non-login) API key for bot/automation access. No
// self-service endpoint yet — see be#875.
// Usage: yarn create-api-key --label <bot-label> --role <admin|coordinator|agent> [--agent-id <id>]

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.AGENT];

function parseArgs(): { label: string; role: UserRole; agentId?: number } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : undefined;
  };

  const label = get("--label");
  const role = get("--role") as UserRole | undefined;
  const agentIdRaw = get("--agent-id");

  if (!label || !role || !ALLOWED_ROLES.includes(role)) {
    throw new Error(
      "Usage: yarn create-api-key --label <bot-label> --role <admin|coordinator|agent> [--agent-id <id>]",
    );
  }

  if (role === UserRole.AGENT && !agentIdRaw) {
    throw new Error(
      "--agent-id is required for --role agent (agent-scoped write routes require an AgentPerson membership).",
    );
  }

  return { label, role, agentId: agentIdRaw ? Number(agentIdRaw) : undefined };
}

async function main() {
  const { label, role, agentId } = parseArgs();

  await dataSource.initialize();
  try {
    const userRepository = getRepository(dataSource, User);
    const apiKeyRepository = getRepository(dataSource, ApiKey);
    const agentRepository = getRepository(dataSource, Agent);
    const agentPersonRepository = getRepository(dataSource, AgentPerson);

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

    const rawKey = `n4d_${crypto.randomBytes(32).toString("hex")}`;
    await apiKeyRepository.save(
      new ApiKey({
        label,
        keyHash: await hashPassword(rawKey),
        userId: user.id,
      }),
    );

    console.log(
      `API key "${label}" created (role: ${role}${agent ? `, agent: "${agent.title}"` : ""}). Store it now — it will not be shown again:`,
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
