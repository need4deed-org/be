import {
  ApiMyActivityItem,
  EntityTableName,
  MyActivityEntityType,
  MyActivityKind,
  VolunteerAuditLogType,
} from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";

type ActivityRow = {
  kind: MyActivityKind;
  id: number;
  occurredAt: Date;
  entityType: MyActivityEntityType;
  entityId: number;
  text: string;
  changeType: VolunteerAuditLogType | null;
};

type TitleRow = { entityType: MyActivityEntityType; id: number; title: string };

const ENTITY_TYPES: MyActivityEntityType[] = [
  EntityTableName.AGENT,
  EntityTableName.OPPORTUNITY,
  EntityTableName.VOLUNTEER,
];

async function getActivityRows(
  userId: number,
  limit: number,
): Promise<ActivityRow[]> {
  return dataSource.query(
    `SELECT * FROM (
       SELECT '${MyActivityKind.COMMENT}' AS kind, c.id, c.created_at AS "occurredAt",
         c.entity_type::text AS "entityType", c.entity_id AS "entityId", c.text,
         NULL AS "changeType"
       FROM comment c
       WHERE c.user_id = $1 AND c.entity_type::text = ANY($3)
       UNION ALL
       SELECT '${MyActivityKind.CHANGE}', l.id, l.occurred_at,
         '${EntityTableName.VOLUNTEER}', l.volunteer_id, l.detail, l.type
       FROM volunteer_audit_log l
       WHERE l.actor_user_id = $1
     ) activity
     ORDER BY "occurredAt" DESC, id DESC
     LIMIT $2`,
    [userId, limit, ENTITY_TYPES],
  );
}

async function getTitles(rows: ActivityRow[]): Promise<Map<string, string>> {
  const idsOf = (type: MyActivityEntityType) =>
    rows.filter((row) => row.entityType === type).map((row) => row.entityId);

  const titles: TitleRow[] = await dataSource.query(
    `SELECT '${EntityTableName.VOLUNTEER}' AS "entityType", v.id,
       CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.last_name, '')) AS title
     FROM volunteer v JOIN person p ON p.id = v.person_id
     WHERE v.id = ANY($1)
     UNION ALL
     SELECT '${EntityTableName.OPPORTUNITY}', o.id, o.title
     FROM opportunity o WHERE o.id = ANY($2)
     UNION ALL
     SELECT '${EntityTableName.AGENT}', a.id, a.title
     FROM agent a WHERE a.id = ANY($3)`,
    [
      idsOf(EntityTableName.VOLUNTEER),
      idsOf(EntityTableName.OPPORTUNITY),
      idsOf(EntityTableName.AGENT),
    ],
  );
  return new Map(
    titles.map(({ entityType, id, title }) => [`${entityType}-${id}`, title]),
  );
}

export async function getMyActivity(
  userId: number,
  limit: number,
): Promise<ApiMyActivityItem[]> {
  const rows = await getActivityRows(userId, limit);
  const titles = await getTitles(rows);

  return rows.map((row) => ({
    id: `${row.kind}-${row.id}`,
    kind: row.kind,
    occurredAt: row.occurredAt,
    entityType: row.entityType,
    entityId: row.entityId,
    entityTitle:
      titles.get(`${row.entityType}-${row.entityId}`) || `#${row.entityId}`,
    text: row.text,
    ...(row.changeType ? { changeType: row.changeType } : {}),
  }));
}
