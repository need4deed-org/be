import {
  ApiVolunteerAuditLogGet,
  VolunteerAuditLogType as SdkVolunteerAuditLogType,
} from "need4deed-sdk";
import VolunteerAuditLog from "../../data/entity/volunteer/volunteer-audit-log.entity";

export function dtoVolunteerAuditLog(
  entry: VolunteerAuditLog,
): ApiVolunteerAuditLogGet {
  return {
    id: entry.id,
    volunteerId: entry.volunteerId,
    type: entry.type as SdkVolunteerAuditLogType,
    detail: entry.detail,
    actorUserId: entry.actorUserId ?? null,
    occurredAt: entry.occurredAt,
  };
}
