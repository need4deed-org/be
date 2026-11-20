import {
  ApiMyActivityItem,
  MyActivityEntityType,
  MyActivityKind,
  VolunteerAuditLogType,
} from "need4deed-sdk";

export type MyActivityRow = {
  kind: MyActivityKind;
  id: number;
  occurredAt: Date;
  entityType: MyActivityEntityType;
  entityId: number;
  text: string;
  changeType: VolunteerAuditLogType | null;
};

export const myActivityTitleKey = (
  entityType: MyActivityEntityType,
  entityId: number,
) => `${entityType}-${entityId}`;

export function dtoMyActivityItem(
  row: MyActivityRow,
  titles: Map<string, string>,
): ApiMyActivityItem {
  return {
    id: `${row.kind}-${row.id}`,
    kind: row.kind,
    occurredAt: row.occurredAt,
    entityType: row.entityType,
    entityId: row.entityId,
    entityTitle:
      titles.get(myActivityTitleKey(row.entityType, row.entityId)) ||
      `#${row.entityId}`,
    text: row.text,
    ...(row.changeType ? { changeType: row.changeType } : {}),
  };
}
