import VolunteerAuditLog from "../../data/entity/volunteer/volunteer-audit-log.entity";

// Not yet in the SDK (be#919 landed ahead of a published contract for this
// endpoint) — fe#957 should get this typed properly via the SDK before
// consuming it, per the shared "API changes go through the SDK first" rule.
export interface VolunteerAuditLogEntryDto {
  id: number;
  volunteerId: number;
  type: string;
  detail: string;
  actorUserId: number | null;
  occurredAt: Date;
}

export function dtoVolunteerAuditLog(
  entry: VolunteerAuditLog,
): VolunteerAuditLogEntryDto {
  return {
    id: entry.id,
    volunteerId: entry.volunteerId,
    type: entry.type,
    detail: entry.detail,
    actorUserId: entry.actorUserId ?? null,
    occurredAt: entry.occurredAt,
  };
}
