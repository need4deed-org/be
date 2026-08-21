import { UserRole } from "need4deed-sdk";
import { NotFoundError } from "../../../config";
import Agent from "../../../data/entity/opportunity/agent.entity";

// A coordinator-created agent (fe#911) stays `unclaimed` until a real
// registration claims it, and must stay invisible to non-coordinator/admin
// callers across every /agent/:id-scoped route, not just GET /agent/:id —
// otherwise a sibling route that skips this check leaks its existence via a
// response distinguishable from a genuinely nonexistent id. 404 rather than
// 403 so existence isn't leaked to a caller guessing ids.
export function assertAgentVisible(
  agent: Agent,
  role: UserRole | undefined,
): void {
  const isPrivileged = role === UserRole.COORDINATOR || role === UserRole.ADMIN;
  if (agent.unclaimed && !isPrivileged) {
    throw new NotFoundError(`Agent (id:${agent.id}) not found.`);
  }
}
