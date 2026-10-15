import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  ApiAgentAddressConflict,
  ApiAgentAlreadyRegisteredConflict,
  ApiAgentRegisterNew,
} from "need4deed-sdk";
import { DataSource, EntityManager, In } from "typeorm";
import { BadRequestError, BaseError, NotFoundError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentLanguage from "../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import logger from "../../../logger";
import { syncAgentDistrictFromPostcode } from "./add-district-to-agent";
import { claimAgent } from "./claim-agent";
import { createAddress } from "./for-routes";
import { isFreeEmailDomain } from "./free-email-domains";
import { getAgentByAddress } from "./get-agent-by-postcode";
import { isAgentDomainAllowed } from "./is-agent-domain-allowed";
import { isEmailDomainTrusted } from "./is-trusted-domain";

export interface RegisterAgentResult {
  agentId: number;
  membershipStatus: AgentMembershipStatus;
}

export class AgentAddressConflictError extends BaseError {
  constructor(
    public readonly agentId: number,
    agentTitle?: string,
  ) {
    const details: ApiAgentAddressConflict = {
      conflict: "address",
      agentId,
      ...(agentTitle ? { agentTitle } : {}),
    };
    super("An agent at this address already exists.", 409, true, {
      ...details,
    });
  }
}

export class AgentAlreadyRegisteredError extends BaseError {
  constructor(
    public readonly agentId: number,
    public readonly membershipStatus: AgentMembershipStatus,
  ) {
    const details: ApiAgentAlreadyRegisteredConflict = {
      conflict: "registered",
      agentId,
      membershipStatus,
    };
    super(
      "Agent registration already completed or awaiting approval.",
      409,
      true,
      { ...details },
    );
  }
}

export class AgentTitleConflictError extends BaseError {
  constructor(public readonly agentId?: number) {
    super("An agent with this title already exists.", 409, true, {
      conflict: "title",
      ...(agentId !== undefined ? { agentId } : {}),
    });
  }
}

export async function findRegistrationMembership(
  personId: number,
  {
    manager = dataSource,
    relations = [],
  }: { manager?: DataSource | EntityManager; relations?: string[] } = {},
): Promise<AgentPerson | null> {
  const memberships = await manager.getRepository(AgentPerson).find({
    where: { personId, role: AgentRoleType.VOLUNTEER_COORDINATOR },
    relations,
    order: { id: "ASC" },
  });
  return (
    memberships.find((m) => m.status === AgentMembershipStatus.ACTIVE) ??
    memberships[0] ??
    null
  );
}

// Serializes concurrent submissions so they can't both pass the check.
export async function lockRegistration(
  personId: number,
  manager: EntityManager,
): Promise<void> {
  await manager.query(
    "SELECT pg_advisory_xact_lock(hashtext('agent-register'), $1)",
    [personId],
  );
}

async function assertNotRegistered(
  personId: number,
  manager: EntityManager,
): Promise<void> {
  await lockRegistration(personId, manager);
  const membership = await findRegistrationMembership(personId, { manager });
  if (membership) {
    throw new AgentAlreadyRegisteredError(
      membership.agentId,
      membership.status,
    );
  }
}

// Only registrants who would join as ACTIVE may learn the NGO's name — the
// same rule as the registration search.
async function getTitleVisibleToRegistrant(
  agent: Agent,
  registrantEmail: string | undefined,
  manager: DataSource | EntityManager,
): Promise<string | undefined> {
  if (!registrantEmail || agent.unclaimed) {
    return undefined;
  }
  try {
    const status = await resolveJoinStatus(agent.id, registrantEmail, manager);
    return status === AgentMembershipStatus.ACTIVE ? agent.title : undefined;
  } catch (error) {
    // Never turn the 409 into a 500; the conflict just goes out unnamed.
    logger.warn(
      `register-agent: conflict title lookup failed for agent ${agent.id}: ${error}`,
    );
    return undefined;
  }
}

async function assertNoAddressConflict(
  { addressStreet, addressPostcode, confirmSharedAddress }: ApiAgentRegisterNew,
  manager: DataSource | EntityManager = dataSource,
  registrantEmail?: string,
): Promise<void> {
  if (confirmSharedAddress || !addressStreet || !addressPostcode) {
    return;
  }
  const agents = await manager.getRepository(Agent).find({
    relations: ["address.postcode", "agentPostcode.postcode"],
  });
  const match = getAgentByAddress(agents, addressStreet, addressPostcode);
  if (match) {
    throw new AgentAddressConflictError(
      match.id,
      await getTitleVisibleToRegistrant(match, registrantEmail, manager),
    );
  }
}

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

  const newAgent = new Agent({
    title: input.title,
    organizationId: input.organizationId,
    agentTypeId: input.typeId ?? undefined,
    info: input.info ?? undefined,
    website: input.website ?? undefined,
    addressId: address?.id,
    unclaimed,
  });
  if (address || input.addressPostcode) {
    await syncAgentDistrictFromPostcode(
      newAgent,
      address?.postcodeId ?? ({ value: input.addressPostcode } as Postcode),
      manager,
    );
  }
  const agent = await manager.getRepository(Agent).save(newAgent);

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

type AgentRegisterInput = ApiAgentRegisterNew & { phone?: string };

export async function createAgentForPerson(
  personId: number,
  input: AgentRegisterInput,
  registrantEmail?: string,
): Promise<RegisterAgentResult> {
  let result!: RegisterAgentResult;

  try {
    await dataSource.manager.transaction(async (manager) => {
      await assertNotRegistered(personId, manager);
      await assertNoAddressConflict(input, manager, registrantEmail);
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
    throw await toRegisterAgentError(err, input);
  }

  return result;
}

export async function createAgent(
  input: ApiAgentRegisterNew,
): Promise<{ agentId: number }> {
  await assertNoAddressConflict(input);

  let agentId!: number;

  try {
    await dataSource.manager.transaction(async (manager) => {
      const agent = await createBareAgent(input, manager, true);
      agentId = agent.id;
    });
  } catch (err) {
    throw await toRegisterAgentError(err, input);
  }

  return { agentId };
}

export async function resolveJoinStatus(
  agentId: number,
  registrantEmail: string,
  manager: DataSource | EntityManager = dataSource,
): Promise<AgentMembershipStatus> {
  const agent = await manager.getRepository(Agent).findOne({
    select: { id: true, engagementStatus: true },
    where: { id: agentId },
  });
  if (agent?.engagementStatus === AgentEngagementStatusType.INACTIVE) {
    return AgentMembershipStatus.PENDING;
  }

  const allowed = await isAgentDomainAllowed(
    registrantEmail,
    async (domain) => {
      const members = await manager.getRepository(AgentPerson).find({
        where: { agentId, status: AgentMembershipStatus.ACTIVE },
        relations: ["person", "person.users"],
      });
      return members.some((member) => isMemberOnDomain(member, domain));
    },
    manager,
  );

  return allowed ? AgentMembershipStatus.ACTIVE : AgentMembershipStatus.PENDING;
}

// Only ACTIVE members count: a PENDING row is an unreviewed join request, and
// counting it would let a registrant vouch for their own domain (be#1041).
function isMemberOnDomain(member: AgentPerson, domain: string): boolean {
  const suffix = `@${domain}`;
  const personEmail = member.person?.email;
  if (personEmail) {
    return personEmail.toLowerCase().endsWith(suffix);
  }
  return (member.person?.users ?? []).some((user) =>
    user.email?.toLowerCase().endsWith(suffix),
  );
}

// Batch form of resolveJoinStatus's domain check, for callers that already
// filtered out unclaimed/INACTIVE agents: which of agentIds would the
// registrant JOIN as ACTIVE.
export async function getAgentIdsJoinableAsActive(
  registrantEmail: string,
  agentIds: number[],
): Promise<Set<number>> {
  const domain = (registrantEmail || "").split("@").pop()?.toLowerCase();
  if (!domain || agentIds.length === 0) {
    return new Set();
  }
  if (await isEmailDomainTrusted(registrantEmail)) {
    return new Set(agentIds);
  }
  if (isFreeEmailDomain(domain)) {
    return new Set();
  }

  const members = await dataSource.getRepository(AgentPerson).find({
    where: { agentId: In(agentIds), status: AgentMembershipStatus.ACTIVE },
    relations: ["person", "person.users"],
  });
  return new Set(
    members
      .filter((member) => isMemberOnDomain(member, domain))
      .map((member) => member.agentId),
  );
}

export async function joinAgent(
  personId: number,
  agentId: number,
  registrantEmail: string,
): Promise<RegisterAgentResult> {
  let status!: AgentMembershipStatus;

  await dataSource.manager.transaction(async (manager) => {
    await assertNotRegistered(personId, manager);
    const agent = await manager
      .getRepository(Agent)
      .findOne({ select: { id: true }, where: { id: agentId } });
    if (!agent) {
      throw new NotFoundError(`Agent (id:${agentId}) not found.`);
    }
    status = await resolveJoinStatus(agentId, registrantEmail, manager);
    await manager.getRepository(AgentPerson).save(
      new AgentPerson({
        agentId,
        personId,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status,
      }),
    );
    if (status === AgentMembershipStatus.ACTIVE) {
      await claimAgent(agentId, manager);
    }
  });

  return { agentId, membershipStatus: status };
}

async function toRegisterAgentError(
  err: unknown,
  input: ApiAgentRegisterNew,
): Promise<unknown> {
  switch (classifyRegisterAgentConflict(err)) {
    case "title": {
      const existing = await dataSource
        .getRepository(Agent)
        .findOne({ where: { title: input.title } });
      return new AgentTitleConflictError(existing?.id);
    }
    case "organization":
      return new BadRequestError(
        `Organization (id:${input.organizationId}) not found.`,
      );
    default:
      return err;
  }
}

export function classifyRegisterAgentConflict(
  err: unknown,
): "title" | "organization" | null {
  const e = err as { code?: string; detail?: string };
  if (!e?.detail) {
    return null;
  }
  if (e.code === "23505" && e.detail.includes("title")) {
    return "title";
  }
  if (e.code === "23503" && e.detail.includes("organization_id")) {
    return "organization";
  }
  return null;
}
