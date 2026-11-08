import { FastifyRequest } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
} from "need4deed-sdk";

const LIVE_SHARING = `
  WITH live_sharing AS (
    SELECT a.id FROM agent a
     WHERE a.shares_volunteers
       AND a.engagement_status <> $2
       AND EXISTS (SELECT 1 FROM agent_person ap
                    WHERE ap.agent_id = a.id AND ap.status = $3))`;

async function queryAgentIds(
  request: FastifyRequest,
  select: string,
  agentIds: number[],
): Promise<number[]> {
  const rows: { id: number }[] =
    await request.server.db.agentRepository.manager.query(
      `${LIVE_SHARING} ${select}`,
      [
        agentIds,
        AgentEngagementStatusType.INACTIVE,
        AgentMembershipStatus.ACTIVE,
      ],
    );
  return rows.map(({ id }) => Number(id));
}

export function getLiveSharingAgentIds(
  request: FastifyRequest,
  agentIds: number[],
): Promise<number[]> {
  return queryAgentIds(
    request,
    "SELECT id FROM live_sharing WHERE id = ANY($1)",
    agentIds,
  );
}

export function getSharingPeerAgentIds(
  request: FastifyRequest,
  agentIds: number[],
): Promise<number[]> {
  return queryAgentIds(
    request,
    `SELECT id FROM live_sharing
      WHERE EXISTS (SELECT 1 FROM live_sharing own WHERE own.id = ANY($1))`,
    agentIds,
  );
}
