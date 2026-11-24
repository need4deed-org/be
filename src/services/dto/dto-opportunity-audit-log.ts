import {
  ApiOpportunityAuditLogGet,
  OpportunityAuditLogType as SdkOpportunityAuditLogType,
} from "need4deed-sdk";
import OpportunityAuditLog from "../../data/entity/opportunity/opportunity-audit-log.entity";

export function dtoOpportunityAuditLog(
  entry: OpportunityAuditLog,
): ApiOpportunityAuditLogGet {
  return {
    id: entry.id,
    opportunityId: entry.opportunityId,
    type: entry.type as SdkOpportunityAuditLogType,
    detail: entry.detail,
    actorUserId: entry.actorUserId ?? null,
    occurredAt: entry.occurredAt,
  };
}
