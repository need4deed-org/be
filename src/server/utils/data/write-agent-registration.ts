import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  ApiAgentRegisterNew,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BaseError, NotFoundError, UnauthorizedError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import AgentLanguage from "../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import { createAddress } from "./for-routes";
import { getAgentByAddress } from "./get-agent-by-postcode";
import { isEmailDomainTrusted } from "./is-trusted-domain";

export interface RegisterAgentResult {
  agentId: number;
  membershipStatus: AgentMembershipStatus;
}

/**
 * Raised by createAgentForPerson when the street+postcode already match an
 * existing agent (via the same getAgentByAddress picker POST /opportunity/legacy
 * uses). The route maps it to a 409 + agentId so the client can offer JOIN.
 */
export class AgentAddressConflictError extends BaseError {
  constructor(public readonly agentId: number) {
    super("An agent at this address already exists.", 409, true, {
      conflict: "address",
      agentId,
    });
  }
}

/**
 * Raised by createAgent (coordinator/admin bare-create, fe#911) on a
 * unique-title violation. Mirrors AgentAddressConflictError's response shape
 * so the route can let it propagate to the global error handler instead of
 * hand-building the 409 body itself.
 */
export class AgentTitleConflictError extends BaseError {
  constructor(public readonly agentId?: number) {
    super("An agent with this title already exists.", 409, true, {
      conflict: "title",
      ...(agentId !== undefined ? { agentId } : {}),
    });
  }
}

// Dedup: if the street+postcode already resolve to an existing agent (same
// picker POST /opportunity/legacy uses), don't mint a duplicate — surface it
// so the caller can offer JOIN (self-registration) or just point at the
// existing agent (coordinator create) instead.
async function assertNoAddressConflict(
  addressStreet?: string,
  addressPostcode?: string,
): Promise<void> {
  if (!addressStreet || !addressPostcode) {
    return;
  }
  const agents = await dataSource.getRepository(Agent).find({
    relations: ["address.postcode", "agentPostcode.postcode"],
  });
  const match = getAgentByAddress(agents, addressStreet, addressPostcode);
  if (match) {
    throw new AgentAddressConflictError(match.id);
  }
}

// The Agent + Address + AgentService + AgentLanguage rows shared by both the
// self-registration CREATE path and the coordinator-created (personless)
// path — everything except the AgentPerson membership itself, which only the
// former needs.
async function createBareAgent(
  input: ApiAgentRegisterNew,
  manager: EntityManager,
  unclaimed = false,
): Promise<Agent> {
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
      agentTypeId: input.typeId ?? undefined,
      info: input.info ?? undefined,
      website: input.website ?? undefined,
      districtId: input.districtId ?? undefined,
      addressId: address?.id,
      unclaimed,
    }),
  );

  if (input.serviceIds?.length) {
    await manager
      .getRepository(AgentService)
      .save(
        input.serviceIds.map(
          (serviceId) => ({ agentId: agent.id, serviceId }) as AgentService,
        ),
      );
  }

  if (input.languages?.length) {
    await manager
      .getRepository(AgentLanguage)
      .save(
        input.languages.map(
          (languageId) => ({ agentId: agent.id, languageId }) as AgentLanguage,
        ),
      );
  }

  return agent;
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
type AgentRegisterInput = ApiAgentRegisterNew & { phone?: string };

export async function createAgentForPerson(
  personId: number,
  input: AgentRegisterInput,
): Promise<RegisterAgentResult> {
  await assertNoAddressConflict(input.addressStreet, input.addressPostcode);

  let result!: RegisterAgentResult;

  try {
    await dataSource.manager.transaction(async (manager) => {
      const agent = await createBareAgent(input, manager);

      await manager.getRepository(AgentPerson).save(
        new AgentPerson({
          agentId: agent.id,
          personId,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );

      if (input.phone) {
        await manager
          .getRepository(Person)
          .update({ id: personId }, { phone: input.phone });
      }

      result = {
        agentId: agent.id,
        membershipStatus: AgentMembershipStatus.ACTIVE,
      };
    });
  } catch (err) {
    if (classifyRegisterAgentConflict(err) === "title") {
      const existing = await dataSource
        .getRepository(Agent)
        .findOne({ where: { title: input.title } });
      throw new AgentTitleConflictError(existing?.id);
    }
    throw err;
  }

  return result;
}

/**
 * COORDINATOR/ADMIN create path (fe#911, be side): an Agent with no linked
 * Person/User at all — for adding an NGO the coordinator already has details
 * for, before it has self-registered. Shares createBareAgent with
 * createAgentForPerson; the only difference is there's no AgentPerson
 * membership (and thus no phone-on-Person write) to add.
 */
export async function createAgent(
  input: ApiAgentRegisterNew,
): Promise<{ agentId: number }> {
  await assertNoAddressConflict(input.addressStreet, input.addressPostcode);

  let agentId!: number;

  try {
    await dataSource.manager.transaction(async (manager) => {
      const agent = await createBareAgent(input, manager, true);
      agentId = agent.id;
    });
  } catch (err) {
    if (classifyRegisterAgentConflict(err) === "title") {
      const existing = await dataSource
        .getRepository(Agent)
        .findOne({ where: { title: input.title } });
      throw new AgentTitleConflictError(existing?.id);
    }
    throw err;
  }

  return { agentId };
}

/**
 * Resolve whether a join may be auto-approved. Mirrors the POST /opportunity/legacy
 * authorization: the registrant's email domain must already belong to the agent
 * (i.e. an existing member shares the domain). Registrant emails are already
 * restricted to allowlisted RAC domains, so a domain match is a strong "same
 * org" signal. No match -> PENDING, surfaced to an ADMIN/COORDINATOR.
 *
 * Per member the match uses Person.email, falling back to the linked User
 * email(s) when the Person has none (Person.email is often unset, but the User
 * always has one).
 */
export async function resolveJoinStatus(
  agentId: number,
  registrantEmail: string,
): Promise<AgentMembershipStatus> {
  const domain = registrantEmail.split("@").pop()?.toLowerCase();
  if (!domain) {
    return AgentMembershipStatus.PENDING;
  }
  const suffix = `@${domain}`;

  const members = await dataSource.getRepository(AgentPerson).find({
    where: { agentId },
    relations: ["person", "person.users"],
  });

  const matched = members.some((member) => {
    const personEmail = member.person?.email;
    if (personEmail) {
      return personEmail.toLowerCase().endsWith(suffix);
    }
    return (member.person?.users ?? []).some((user) =>
      user.email?.toLowerCase().endsWith(suffix),
    );
  });

  // Auto-approve when an existing member shares the domain, or the domain is on
  // the trusted allowlist (a brand-new org's first representative).
  const trusted = matched || (await isEmailDomainTrusted(registrantEmail));
  return trusted ? AgentMembershipStatus.ACTIVE : AgentMembershipStatus.PENDING;
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
  const agentRepo = dataSource.getRepository(Agent);

  // A coordinator-created agent (fe#911) is marked `unclaimed` until a real
  // registration claims it — that claim must go through a future,
  // explicitly-reviewed flow, not this auto-approve-on-domain-match JOIN.
  // Excluding it from the /search picker isn't enough on its own: this route
  // takes agentId directly from the client, so anyone who already has (or
  // guesses) the id could otherwise join straight past that picker. Gating on
  // this flag rather than "zero AgentPerson rows" matters: pre-existing
  // legacy agents (created via POST /opportunity/legacy with no rac_email)
  // can also have zero AgentPerson rows and must remain joinable.
  const agent = await agentRepo.findOne({ where: { id: agentId } });
  if (!agent) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }
  if (agent.unclaimed) {
    throw new UnauthorizedError(
      "This agent has not been claimed yet and cannot be joined directly.",
    );
  }
  // An INACTIVE agent (be#885) isn't offered by the /search picker either,
  // for the same reason: a new registrant shouldn't be routed toward an NGO
  // that's been marked inactive. Same bypass risk as unclaimed above — this
  // route takes agentId directly from the client, so the /search exclusion
  // alone doesn't stop a direct join.
  if (agent.engagementStatus === AgentEngagementStatusType.INACTIVE) {
    throw new UnauthorizedError("This agent is inactive and cannot be joined.");
  }

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
