import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import Opportunity from "../entity/opportunity/opportunity.entity";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";

type MatchChange = {
  volunteerId: number;
  opportunityId: number;
  // undefined: the match was just created / just removed.
  from?: OpportunityVolunteerStatusType;
  to?: OpportunityVolunteerStatusType;
  actorUserId?: number;
};

// One volunteer activity-log entry per match step (be#1121).
export async function logMatchChange(
  manager: EntityManager,
  { volunteerId, opportunityId, from, to, actorUserId }: MatchChange,
): Promise<void> {
  if (from === to) {
    return;
  }
  const opportunity = await manager.findOne(Opportunity, {
    select: { id: true, title: true },
    where: { id: opportunityId },
  });
  const title = `"${opportunity?.title ?? `#${opportunityId}`}"`;

  let detail: string;
  if (from === undefined) {
    detail = `Linked to opportunity ${title} as ${to}.`;
  } else if (to === undefined) {
    detail = `Removed from opportunity ${title} (was ${from}).`;
  } else {
    detail = `Opportunity ${title} status changed from ${from} to ${to}.`;
  }

  await manager.save(
    VolunteerAuditLog,
    new VolunteerAuditLog({
      volunteerId,
      type: "opportunity_status_changed",
      detail,
      actorUserId,
      occurredAt: new Date(),
    }),
  );
}
