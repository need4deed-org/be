import { EntityManager } from "typeorm";
import OpportunityAuditLog from "../entity/opportunity/opportunity-audit-log.entity";

export const opportunityChangeDetail = {
  details: "Details updated.",
  contact: "Contact person changed.",
  ngo: (from: string, to: string) => `NGO changed from ${from} to ${to}.`,
};

export type OpportunityChange = Pick<OpportunityAuditLog, "type" | "detail">;

export async function logOpportunityChanges(
  manager: EntityManager,
  opportunityId: number,
  changes: OpportunityChange[],
  actorUserId?: number,
): Promise<void> {
  if (!changes.length) {
    return;
  }
  const occurredAt = new Date();
  await manager.save(
    OpportunityAuditLog,
    changes.map(
      (change) =>
        new OpportunityAuditLog({
          ...change,
          opportunityId,
          actorUserId,
          occurredAt,
        }),
    ),
  );
}
