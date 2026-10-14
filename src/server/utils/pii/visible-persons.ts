import { FastifyRequest } from "fastify";
import {
  AgentMembershipStatus,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { In } from "typeorm";
import User from "../../../data/entity/user.entity";
import { getCallerAgentIds } from "../data/get-caller-agent-ids";

export interface CallerVisibility {
  userId: number;
  role: UserRole;
  personIds: Set<number>;
  opportunityIds: Set<number>;
  agentIds: Set<number>;
  matchedAgentIds: Set<number>;
  ownerAgentIds: Set<number>;
}

export const VISIBLE_MATCH_STATUSES = [
  OpportunityVolunteerStatusType.MATCHED,
  OpportunityVolunteerStatusType.ACTIVE,
];

export function anonymousVisibility(): CallerVisibility {
  return {
    userId: 0,
    role: UserRole.USER,
    personIds: new Set<number>(),
    opportunityIds: new Set<number>(),
    agentIds: new Set<number>(),
    matchedAgentIds: new Set<number>(),
    ownerAgentIds: new Set<number>(),
  };
}

export async function resolveCallerVisibility(
  request: FastifyRequest,
  user: User,
): Promise<CallerVisibility> {
  const visibility: CallerVisibility = {
    ...anonymousVisibility(),
    userId: user.id,
    role: user.role,
  };
  const {
    personIds,
    opportunityIds,
    agentIds,
    matchedAgentIds,
    ownerAgentIds,
  } = visibility;
  const personId = user.personId ?? undefined;

  if (user.role === UserRole.USER || !personId) {
    return visibility;
  }

  personIds.add(personId);

  if (user.role === UserRole.VOLUNTEER) {
    const rows: { opportunity_id: number; agent_id: number | null }[] =
      await request.server.db.agentPersonRepository.manager.query(
        `SELECT ov.opportunity_id, o.agent_id
           FROM opportunity_volunteer ov
           JOIN volunteer v ON v.id = ov.volunteer_id
           JOIN opportunity o ON o.id = ov.opportunity_id
          WHERE v.person_id = $1
            AND ov.status = ANY($2)`,
        [personId, VISIBLE_MATCH_STATUSES],
      );
    rows.forEach((r) => {
      opportunityIds.add(Number(r.opportunity_id));
      if (r.agent_id !== null) {
        matchedAgentIds.add(Number(r.agent_id));
      }
    });
    return visibility;
  }

  if (user.role !== UserRole.AGENT) {
    return visibility;
  }

  const agentPersonRepository = request.server.db.agentPersonRepository;
  const callerAgentIds = await getCallerAgentIds(request, personId);
  callerAgentIds.forEach((id) => agentIds.add(id));

  if (agentIds.size === 0) {
    return visibility;
  }

  const members = await agentPersonRepository.find({
    where: { agentId: In([...agentIds]), status: AgentMembershipStatus.ACTIVE },
  });
  members.forEach((m) => personIds.add(m.personId));

  agentIds.forEach((id) => ownerAgentIds.add(id));

  const rows: { id: number; person_id: number | null }[] =
    await agentPersonRepository.manager.query(
      `SELECT o.id, v.person_id
         FROM opportunity o
         LEFT JOIN opportunity_volunteer ov ON ov.opportunity_id = o.id
         LEFT JOIN volunteer v ON v.id = ov.volunteer_id
          AND (v.owner_agent_id IS NULL
               OR v.owner_agent_id = ANY($1)
               OR ov.status = ANY($2))
        WHERE o.agent_id = ANY($1)`,
      [[...agentIds], VISIBLE_MATCH_STATUSES],
    );
  rows.forEach((r) => {
    opportunityIds.add(Number(r.id));
    if (r.person_id !== null) {
      personIds.add(Number(r.person_id));
    }
  });

  const owned: { person_id: number | null }[] =
    await agentPersonRepository.manager.query(
      `SELECT person_id FROM volunteer WHERE owner_agent_id = ANY($1)`,
      [[...agentIds]],
    );
  owned.forEach((r) => {
    if (r.person_id !== null) {
      personIds.add(Number(r.person_id));
    }
  });

  return visibility;
}
