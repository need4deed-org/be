import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import User from "../../../data/entity/user.entity";
import { getCallerAgentIds } from "./get-caller-agent-ids";

// An AGENT may only reach opportunities belonging to an agent they are an
// ACTIVE member of. 404 rather than 403 so a caller guessing ids can't tell
// an opportunity they don't own from one that doesn't exist. COORDINATOR and
// ADMIN callers are unaffected.
export async function assertAgentOwnsOpportunity(
  authUser: User | undefined,
  opportunityId: number,
  opportunityAgentId: number | null | undefined,
): Promise<void> {
  if (authUser?.role !== UserRole.AGENT) {
    return;
  }

  const agentIds = await getCallerAgentIds(authUser.personId);

  if (!opportunityAgentId || !agentIds.includes(opportunityAgentId)) {
    throw new NotFoundError(`Opportunity (id:${opportunityId}) not found.`);
  }
}
