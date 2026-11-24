import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { EntityManager } from "typeorm";
import logger from "../../logger";
import OpportunityAuditLog from "../entity/opportunity/opportunity-audit-log.entity";
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
  skipOpportunityLog?: boolean;
};

const linkedPrefix = (title: string) => `Linked to opportunity "${title}"`;

export const matchDetail = {
  title: (title: string | null | undefined, opportunityId: number) =>
    title ?? `#${opportunityId}`,
  linkedPrefix,
  linked: (
    title: string,
    status?: OpportunityVolunteerStatusType,
    imported = false,
  ) =>
    `${linkedPrefix(title)}${status ? ` as ${status}` : ""}${imported ? " (imported)" : ""}.`,
  removed: (title: string, from: OpportunityVolunteerStatusType) =>
    `Removed from opportunity "${title}" (was ${from}).`,
  statusChanged: (
    title: string,
    {
      from,
      to,
    }: {
      from?: OpportunityVolunteerStatusType;
      to: OpportunityVolunteerStatusType;
    },
  ) =>
    `Opportunity "${title}" status changed${from ? ` from ${from}` : ""} to ${to}.`,
};

const volunteerLabel = (volunteerId: number) => `Volunteer #${volunteerId}`;

export const opportunityMatchDetail = {
  linked: (volunteerId: number, status?: OpportunityVolunteerStatusType) =>
    `${volunteerLabel(volunteerId)} linked${status ? ` as ${status}` : ""}.`,
  removed: (volunteerId: number, from: OpportunityVolunteerStatusType) =>
    `${volunteerLabel(volunteerId)} removed (was ${from}).`,
  statusChanged: (
    volunteerId: number,
    {
      from,
      to,
    }: {
      from?: OpportunityVolunteerStatusType;
      to: OpportunityVolunteerStatusType;
    },
  ) =>
    `${volunteerLabel(volunteerId)} match status changed${from ? ` from ${from}` : ""} to ${to}.`,
};

export async function logMatchChange(
  manager: EntityManager,
  {
    volunteerId,
    opportunityId,
    from,
    to,
    actorUserId,
    skipOpportunityLog,
    ...known
  }: MatchChange,
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
  const title = matchDetail.title(opportunityTitle, opportunityId);

  let detail: string;
  let opportunityDetail: string;
  if (from === undefined) {
    detail = matchDetail.linked(title, to);
    opportunityDetail = opportunityMatchDetail.linked(volunteerId, to);
  } else if (to === undefined) {
    detail = matchDetail.removed(title, from);
    opportunityDetail = opportunityMatchDetail.removed(volunteerId, from);
  } else {
    detail = matchDetail.statusChanged(title, { from, to });
    opportunityDetail = opportunityMatchDetail.statusChanged(volunteerId, {
      from,
      to,
    });
  }
  const occurredAt = new Date();

  await manager.save(
    VolunteerAuditLog,
    new VolunteerAuditLog({
      volunteerId,
      type: "opportunity_status_changed",
      detail,
      actorUserId,
      occurredAt,
    }),
  );
  if (!skipOpportunityLog) {
    await manager.save(
      OpportunityAuditLog,
      new OpportunityAuditLog({
        opportunityId,
        type: "match-changed",
        detail: opportunityDetail,
        actorUserId,
        occurredAt,
      }),
    );
  }
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
