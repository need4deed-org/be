import {
  AgentMembershipStatus,
  AgentRoleType,
  ApiAgentRegisterNew,
} from "need4deed-sdk";
import { ILike } from "typeorm";
import { dataSource } from "../../../data/data-source";
import AgentLanguage from "../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import { createAddress } from "./for-routes";

export interface RegisterAgentResult {
  agentId: number;
  membershipStatus: AgentMembershipStatus;
}

/**
 * CREATE path: a verified user creates a brand-new agent and becomes its first
 * VOLUNTEER_COORDINATOR. The creator owns the record, so the membership is
 * ACTIVE immediately. Persisted in one transaction:
 *   1. Agent (with optional Address resolved from street + postcode)
 *   2. AgentPerson linking the registrant's Person as VOLUNTEER_COORDINATOR
 *   3. AgentLanguage rows for the selected language ids
 *
 * The user + person already exist (created via POST /user + email verification);
 * this only writes agent-side records. A unique-title violation bubbles up for
 * the route to convert into a 409 + join suggestion.
 */
export async function createAgentForPerson(
  personId: number,
  input: ApiAgentRegisterNew,
): Promise<RegisterAgentResult> {
  let result!: RegisterAgentResult;

  await dataSource.manager.transaction(async (manager) => {
    const address =
      input.addressStreet && input.addressPostcode
        ? await createAddress(
            { street: input.addressStreet },
            { value: input.addressPostcode },
            manager,
          )
        : null;

    const agent = await manager.getRepository(Agent).save(
      new Agent({
        title: input.title,
        type: input.type ?? undefined,
        info: input.info ?? undefined,
        website: input.website ?? undefined,
        services: input.services ?? undefined,
        districtId: input.districtId ?? undefined,
        addressId: address?.id,
      }),
    );

    await manager.getRepository(AgentPerson).save(
      new AgentPerson({
        agentId: agent.id,
        personId,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    if (input.languages?.length) {
      await manager
        .getRepository(AgentLanguage)
        .save(
          input.languages.map(
            (languageId) =>
              ({ agentId: agent.id, languageId }) as AgentLanguage,
          ),
        );
    }

    result = {
      agentId: agent.id,
      membershipStatus: AgentMembershipStatus.ACTIVE,
    };
  });

  return result;
}

/**
 * Resolve whether a join may be auto-approved. Mirrors the POST /opportunity/legacy
 * authorization: the registrant's email domain must already belong to the agent
 * (i.e. an existing member shares the domain). Registrant emails are already
 * restricted to allowlisted RAC domains, so a domain match is a strong "same
 * org" signal. No match -> PENDING, surfaced to an ADMIN/COORDINATOR.
 */
export async function resolveJoinStatus(
  agentId: number,
  registrantEmail: string,
): Promise<AgentMembershipStatus> {
  const domain = registrantEmail.split("@").pop();
  if (!domain) {
    return AgentMembershipStatus.PENDING;
  }

  const existing = await dataSource.getRepository(AgentPerson).findOne({
    where: { agentId, person: { email: ILike(`%@${domain}`) } },
    relations: ["person"],
  });

  return existing
    ? AgentMembershipStatus.ACTIVE
    : AgentMembershipStatus.PENDING;
}

/**
 * JOIN path: link a verified user's Person to an existing agent. Idempotent —
 * an existing link for the same (agent, person, role) is returned as-is rather
 * than duplicated. Status is decided by the caller via resolveJoinStatus.
 */
export async function joinAgent(
  personId: number,
  agentId: number,
  status: AgentMembershipStatus,
): Promise<RegisterAgentResult> {
  const repo = dataSource.getRepository(AgentPerson);

  const existing = await repo.findOne({
    where: { agentId, personId, role: AgentRoleType.VOLUNTEER_COORDINATOR },
  });

  if (!existing) {
    await repo.save(
      new AgentPerson({
        agentId,
        personId,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status,
      }),
    );
  }

  return { agentId, membershipStatus: existing?.status ?? status };
}

/**
 * Maps a Postgres unique-violation on agent.title to a small shape the route
 * can use to return a 409 + the existing agent id (so the client can offer to
 * JOIN instead of minting a duplicate), without leaking the raw error.
 */
export function classifyRegisterAgentConflict(err: unknown): "title" | null {
  const e = err as { code?: string; detail?: string };
  if (e?.code !== "23505" || !e.detail) {
    return null;
  }
  return e.detail.includes("title") ? "title" : null;
}
