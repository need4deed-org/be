import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import logger from "../../logger";
import Opportunity from "../entity/opportunity/opportunity.entity";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";

type MatchChange = {
  volunteerId: number;
  opportunityId: number;
  // undefined: the match was just created / just removed.
  from?: OpportunityVolunteerStatusType;
  to?: OpportunityVolunteerStatusType;
  actorUserId?: number;
  // Skips the lookup when the caller already has it.
  title?: string;
};

// One volunteer activity-log entry per match step.
export async function logMatchChange(
  manager: EntityManager,
  { volunteerId, opportunityId, from, to, actorUserId, ...known }: MatchChange,
): Promise<void> {
  if (from === to) {
    return;
  }
  const opportunityTitle =
    known.title ??
    (
      await manager.findOne(Opportunity, {
        select: { id: true, title: true },
        where: { id: opportunityId },
      })
    )?.title;
  const title = `"${opportunityTitle ?? `#${opportunityId}`}"`;

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

// Inside a transaction a failed insert would abort the whole save, so the entry
// goes in a savepoint: a failure only loses the entry, never the match change.
export async function logMatchChangeSafely(
  manager: EntityManager,
  change: MatchChange,
): Promise<void> {
  const queryRunner = manager.queryRunner;
  const inTransaction = Boolean(queryRunner?.isTransactionActive);
  try {
    if (inTransaction) {
      await queryRunner?.query("SAVEPOINT match_log");
    }
    await logMatchChange(manager, change);
    if (inTransaction) {
      await queryRunner?.query("RELEASE SAVEPOINT match_log");
    }
  } catch (error) {
    if (inTransaction) {
      await queryRunner
        ?.query("ROLLBACK TO SAVEPOINT match_log")
        .catch(() => undefined);
    }
    logger.error(`match activity-log entry not saved: ${error}`);
  }
}
