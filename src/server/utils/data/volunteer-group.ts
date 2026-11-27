import {
  ApiGroupCounts,
  ApiGroupDeleteResponse,
  ApiGroupGet,
  ApiGroupPost,
  UserRole,
} from "need4deed-sdk";
import { EntityManager, In, Not } from "typeorm";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  titleOrphanageAgent,
} from "../../../config";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OrganizationPerson from "../../../data/entity/m2m/organization-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Organization from "../../../data/entity/organization.entity";
import User from "../../../data/entity/user.entity";
import VolunteerGroup from "../../../data/entity/volunteer-group.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { dtoGroupGet } from "../../../services/dto/dto-group";
import { lockActiveAdminIds, revokeApiKeys } from "./admin-account";
import { erasedEmailFor, erasePersonPii } from "./erase-person-pii";
import { revokeUserRefreshSessions } from "./refresh-session";

const isErasedUser = (user: Pick<User, "id" | "email">) =>
  user.email === erasedEmailFor(user.id);

function normalizeGroupTitle(rawTitle: string): string {
  const title = rawTitle.trim();
  if (!title) {
    throw new BadRequestError("Group title must not be empty.");
  }
  return title;
}

async function resolveGroupScopeAgentIds(
  manager: EntityManager,
  group: Pick<VolunteerGroup, "organizationId" | "agentId">,
): Promise<number[]> {
  if (group.agentId !== null) {
    return [group.agentId];
  }
  if (group.organizationId !== null) {
    const agents = await manager.find(Agent, {
      select: { id: true },
      where: { organizationId: group.organizationId },
    });
    return agents.map((agent) => agent.id);
  }
  return [];
}

async function resolveGroupMemberPersonIds(
  manager: EntityManager,
  group: Pick<VolunteerGroup, "organizationId" | "agentId">,
): Promise<number[]> {
  if (group.organizationId !== null) {
    const rows = await manager.find(OrganizationPerson, {
      select: { personId: true },
      where: { organizationId: group.organizationId },
    });
    return [...new Set(rows.map((row) => row.personId))];
  }
  if (group.agentId !== null) {
    const rows = await manager.find(AgentPerson, {
      select: { personId: true },
      where: { agentId: group.agentId },
    });
    return [...new Set(rows.map((row) => row.personId))];
  }
  return [];
}

async function countNonErasedGroupAccounts(
  manager: EntityManager,
  memberPersonIds: number[],
): Promise<number> {
  if (memberPersonIds.length === 0) {
    return 0;
  }
  const users = await manager.find(User, {
    select: { id: true, email: true },
    where: {
      personId: In(memberPersonIds),
      role: Not(UserRole.VOLUNTEER),
    },
  });
  return users.filter((user) => !isErasedUser(user)).length;
}

export async function computeGroupCounts(
  manager: EntityManager,
  group: Pick<VolunteerGroup, "organizationId" | "agentId">,
): Promise<ApiGroupCounts> {
  const [agentIds, memberPersonIds] = await Promise.all([
    resolveGroupScopeAgentIds(manager, group),
    resolveGroupMemberPersonIds(manager, group),
  ]);

  const [volunteers, opportunities, accounts] = await Promise.all([
    agentIds.length > 0
      ? manager.count(Volunteer, { where: { ownerAgentId: In(agentIds) } })
      : 0,
    agentIds.length > 0
      ? manager.count(Opportunity, { where: { agentId: In(agentIds) } })
      : 0,
    countNonErasedGroupAccounts(manager, memberPersonIds),
  ]);

  return { volunteers, opportunities, accounts };
}

export async function listVolunteerGroups(
  manager: EntityManager,
): Promise<ApiGroupGet[]> {
  const groups = await manager.find(VolunteerGroup, {
    relations: { organization: true, agent: true },
    order: { title: "ASC", id: "ASC" },
  });
  return Promise.all(
    groups.map(async (group) =>
      dtoGroupGet(group, await computeGroupCounts(manager, group)),
    ),
  );
}

export async function getVolunteerGroup(
  manager: EntityManager,
  id: number,
): Promise<ApiGroupGet> {
  const group = await manager.findOne(VolunteerGroup, {
    where: { id },
    relations: { organization: true, agent: true },
  });
  if (!group) {
    throw new NotFoundError(`Group (id:${id}) not found.`);
  }
  return dtoGroupGet(group, await computeGroupCounts(manager, group));
}

export async function createVolunteerGroup(
  manager: EntityManager,
  body: ApiGroupPost,
): Promise<ApiGroupGet> {
  const title = normalizeGroupTitle(body.title);

  const hasOrg = "organizationId" in body && body.organizationId !== undefined;
  const hasAgent = "agentId" in body && body.agentId !== undefined;
  if (hasOrg === hasAgent) {
    throw new BadRequestError(
      "Exactly one of organizationId or agentId must be provided.",
    );
  }

  let organizationId: number | null = null;
  let agentId: number | null = null;

  if (hasOrg) {
    const requestedOrgId = body.organizationId!;
    const organization = await manager.findOneBy(Organization, {
      id: requestedOrgId,
    });
    if (!organization) {
      throw new NotFoundError(`Organization (id:${requestedOrgId}) not found.`);
    }
    if (
      await manager.existsBy(VolunteerGroup, {
        organizationId: requestedOrgId,
      })
    ) {
      throw new ConflictError(
        `Organization (id:${requestedOrgId}) already has a group.`,
      );
    }
    const orgAgents = await manager.find(Agent, {
      select: { id: true },
      where: { organizationId: requestedOrgId },
    });
    const orgAgentIds = orgAgents.map((agent) => agent.id);
    if (
      orgAgentIds.length > 0 &&
      (await manager.existsBy(VolunteerGroup, { agentId: In(orgAgentIds) }))
    ) {
      throw new ConflictError(
        `One or more agents in organization (id:${requestedOrgId}) already belong to a group.`,
      );
    }
    organizationId = requestedOrgId;
  } else {
    const requestedAgentId = body.agentId!;
    const agent = await manager.findOneBy(Agent, { id: requestedAgentId });
    if (!agent) {
      throw new NotFoundError(`Agent (id:${requestedAgentId}) not found.`);
    }
    if (agent.title === titleOrphanageAgent) {
      throw new BadRequestError(
        "The need4deed orphanage agent cannot be a group.",
      );
    }
    if (await manager.existsBy(VolunteerGroup, { agentId: requestedAgentId })) {
      throw new ConflictError(
        `Agent (id:${requestedAgentId}) already has a group.`,
      );
    }
    if (
      agent.organizationId &&
      (await manager.existsBy(VolunteerGroup, {
        organizationId: agent.organizationId,
      }))
    ) {
      throw new ConflictError(
        `Agent (id:${requestedAgentId}) already belongs to an organization group.`,
      );
    }
    agentId = requestedAgentId;
  }

  let saved: VolunteerGroup;
  try {
    saved = await manager.save(
      new VolunteerGroup({ title, organizationId, agentId }),
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new ConflictError("A group for this scope already exists.");
    }
    throw err;
  }

  return getVolunteerGroup(manager, saved.id);
}

export async function renameVolunteerGroup(
  manager: EntityManager,
  id: number,
  rawTitle: string,
): Promise<ApiGroupGet> {
  const title = normalizeGroupTitle(rawTitle);
  const group = await manager.findOne(VolunteerGroup, {
    where: { id },
    relations: { organization: true, agent: true },
  });
  if (!group) {
    throw new NotFoundError(`Group (id:${id}) not found.`);
  }
  group.title = title;
  await manager.update(VolunteerGroup, { id }, { title });
  return dtoGroupGet(group, await computeGroupCounts(manager, group));
}

export async function deleteVolunteerGroup(
  manager: EntityManager,
  id: number,
  adminId: number,
): Promise<ApiGroupDeleteResponse> {
  await lockActiveAdminIds(manager);

  const group = await manager.findOne(VolunteerGroup, {
    where: { id },
    lock: { mode: "for_no_key_update" },
  });
  if (!group) {
    throw new NotFoundError(`Group (id:${id}) not found.`);
  }

  const [scopeAgentIds, memberPersonIds] = await Promise.all([
    resolveGroupScopeAgentIds(manager, group),
    resolveGroupMemberPersonIds(manager, group),
  ]);

  const [groupVolunteers, groupOpportunities] = await Promise.all([
    scopeAgentIds.length > 0
      ? manager.find(Volunteer, {
          select: { id: true, personId: true },
          where: { ownerAgentId: In(scopeAgentIds) },
        })
      : [],
    scopeAgentIds.length > 0
      ? manager.find(Opportunity, {
          select: { id: true },
          where: { agentId: In(scopeAgentIds) },
        })
      : [],
  ]);

  const memberUsers =
    memberPersonIds.length > 0
      ? (
          await manager.find(User, {
            select: { id: true, email: true, role: true, personId: true },
            where: {
              personId: In(memberPersonIds),
              role: Not(UserRole.VOLUNTEER),
            },
          })
        ).filter((user) => !isErasedUser(user))
      : [];

  const counts: ApiGroupCounts = {
    volunteers: groupVolunteers.length,
    opportunities: groupOpportunities.length,
    accounts: memberUsers.length,
  };

  if (groupVolunteers.length > 0) {
    await manager.update(
      Volunteer,
      { id: In(groupVolunteers.map((volunteer) => volunteer.id)) },
      { ownerAgentId: null },
    );
  }

  if (groupOpportunities.length > 0) {
    const orphanageAgent = await manager.findOne(Agent, {
      select: { id: true },
      where: { title: titleOrphanageAgent },
      order: { id: "ASC" },
    });
    await manager.update(
      Opportunity,
      { id: In(groupOpportunities.map((opportunity) => opportunity.id)) },
      {
        agentId: orphanageAgent?.id ?? null,
        contactPersonId: null,
      },
    );
  }

  if (group.organizationId !== null) {
    await manager.delete(OrganizationPerson, {
      organizationId: group.organizationId,
    });
  } else if (group.agentId !== null) {
    await manager.delete(AgentPerson, { agentId: group.agentId });
  }

  const candidatePersonIds = [
    ...new Set([
      ...memberPersonIds,
      ...groupVolunteers
        .map((volunteer) => volunteer.personId)
        .filter((personId): personId is number => personId !== null),
    ]),
  ];

  let erasedPersons = 0;
  if (candidatePersonIds.length > 0) {
    const allUsers = await manager.find(User, {
      select: { id: true, email: true, role: true, personId: true },
      where: { personId: In(candidatePersonIds) },
    });

    // Never erase platform admin accounts or the acting admin.
    const protectedPersonIds = new Set(
      allUsers
        .filter((user) => user.role === UserRole.ADMIN || user.id === adminId)
        .map((user) => user.personId)
        .filter((personId): personId is number => personId !== null),
    );

    const personIdsToErase = candidatePersonIds.filter(
      (personId) => !protectedPersonIds.has(personId),
    );

    if (personIdsToErase.length > 0) {
      const eraseSet = new Set(personIdsToErase);
      const usersToRevoke = allUsers.filter(
        (user) => user.personId !== null && eraseSet.has(user.personId),
      );
      const nonVolunteerLogins = usersToRevoke.filter(
        (user) => user.role !== UserRole.VOLUNTEER && !isErasedUser(user),
      );

      const now = new Date();
      for (const login of nonVolunteerLogins) {
        await manager.update(
          User,
          { id: login.id },
          {
            isActive: false,
            deactivatedAt: now,
            credentialsValidAfter: now,
            email: erasedEmailFor(login.id),
          },
        );
      }

      const revokeIds = usersToRevoke.map((user) => user.id);
      if (revokeIds.length > 0) {
        for (const userId of revokeIds) {
          await revokeUserRefreshSessions(manager, userId);
        }
        await revokeApiKeys(manager, revokeIds, now);
      }

      for (const personId of personIdsToErase) {
        await erasePersonPii(manager, personId);
      }
      erasedPersons = personIdsToErase.length;
    }
  }

  await manager.delete(VolunteerGroup, { id: group.id });

  return {
    id: group.id,
    counts,
    erasedPersons,
  };
}
