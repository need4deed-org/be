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
    // Cast justified by the compile-time sync assertion on
    // VolunteerAuditLogType in the entity file (be#984).
    type: entry.type as SdkVolunteerAuditLogType,
    detail: entry.detail,
    actorUserId: entry.actorUserId ?? null,
    occurredAt: entry.occurredAt,
  };
}
