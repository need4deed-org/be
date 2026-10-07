import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  ApiAgentRegisterNew,
} from "need4deed-sdk";
import { EntityManager } from "typeorm";
import { BaseError, NotFoundError, UnauthorizedError } from "../../../config";
import { dataSource } from "../../../data/data-source";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentLanguage from "../../../data/entity/m2m/agent-language";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import { syncAgentDistrictFromPostcode } from "./add-district-to-agent";
import { createAddress } from "./for-routes";
import { getAgentByAddress } from "./get-agent-by-postcode";
import { isAgentDomainAllowed } from "./is-agent-domain-allowed";

export interface RegisterAgentResult {
  agentId: number;
  membershipStatus: AgentMembershipStatus;
}

export class AgentAddressConflictError extends BaseError {
  constructor(public readonly agentId: number) {
    super("An agent at this address already exists.", 409, true, {
      conflict: "address",
      agentId,
    });
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

export async function resolveJoinStatus(
  agentId: number,
  registrantEmail: string,
): Promise<AgentMembershipStatus> {
  const allowed = await isAgentDomainAllowed(
    registrantEmail,
    async (domain) => {
      const suffix = `@${domain}`;
      const members = await dataSource.getRepository(AgentPerson).find({
        where: { agentId },
        relations: ["person", "person.users"],
      });
      return members.some((member) => {
        const personEmail = member.person?.email;
        if (personEmail) {
          return personEmail.toLowerCase().endsWith(suffix);
        }
        return (member.person?.users ?? []).some((user) =>
          user.email?.toLowerCase().endsWith(suffix),
        );
      });
    },
  );

  return allowed ? AgentMembershipStatus.ACTIVE : AgentMembershipStatus.PENDING;
}

export async function joinAgent(
  personId: number,
  agentId: number,
  status: AgentMembershipStatus,
): Promise<RegisterAgentResult> {
  const repo = dataSource.getRepository(AgentPerson);
  const agentRepo = dataSource.getRepository(Agent);

  const agent = await agentRepo.findOne({ where: { id: agentId } });
  if (!agent) {
    throw new NotFoundError(`Agent (id:${agentId}) not found.`);
  }
  if (agent.unclaimed) {
    throw new UnauthorizedError(
      "This agent has not been claimed yet and cannot be joined directly.",
    );
  }
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

export function classifyRegisterAgentConflict(err: unknown): "title" | null {
  const e = err as { code?: string; detail?: string };
  if (e?.code !== "23505" || !e.detail) {
    return null;
  }
  return e.detail.includes("title") ? "title" : null;
}
