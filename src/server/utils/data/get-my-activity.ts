import {
  ApiMyActivityItem,
  EntityTableName,
  MyActivityEntityType,
  MyActivityKind,
} from "need4deed-sdk";
import { dataSource } from "../../../data/data-source";
import {
  dtoMyActivityItem,
  MyActivityRow,
  myActivityTitleKey,
} from "../../../services/dto/dto-my-activity";

type TitleRow = { entityType: MyActivityEntityType; id: number; title: string };

async function getActivityRows(
  userId: number,
  limit: number,
): Promise<MyActivityRow[]> {
  return dataSource.query(
    `SELECT * FROM (
       SELECT '${MyActivityKind.COMMENT}' AS kind, c.id, c.updated_at AS "occurredAt",
         c.entity_type::text AS "entityType", c.entity_id AS "entityId", c.text,
         NULL AS "changeType"
       FROM comment c
       WHERE c.user_id = $1
         AND (
           (c.entity_type::text = '${EntityTableName.AGENT}'
             AND EXISTS (SELECT 1 FROM agent a WHERE a.id = c.entity_id))
           OR (c.entity_type::text = '${EntityTableName.OPPORTUNITY}'
             AND EXISTS (SELECT 1 FROM opportunity o WHERE o.id = c.entity_id))
           OR (c.entity_type::text = '${EntityTableName.VOLUNTEER}'
             AND EXISTS (SELECT 1 FROM volunteer v WHERE v.id = c.entity_id))
         )
       UNION ALL
       SELECT '${MyActivityKind.CHANGE}', l.id, l.occurred_at,
         '${EntityTableName.VOLUNTEER}', l.volunteer_id, l.detail, l.type
       FROM volunteer_audit_log l
       WHERE l.actor_user_id = $1
     ) activity
     ORDER BY "occurredAt" DESC, kind, id DESC
     LIMIT $2`,
    [userId, limit],
  );
}

async function getTitles(rows: MyActivityRow[]): Promise<Map<string, string>> {
  if (!rows.length) {
    return new Map();
  }
  const idsOf = (type: MyActivityEntityType) =>
    rows.filter((row) => row.entityType === type).map((row) => row.entityId);

  const titles: TitleRow[] = await dataSource.query(
    `SELECT '${EntityTableName.VOLUNTEER}' AS "entityType", v.id,
       CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.middle_name, ''), NULLIF(p.last_name, '')) AS title
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
    titles.map(({ entityType, id, title }) => [
      myActivityTitleKey(entityType, id),
      title,
    ]),
  );
}

export async function getMyActivity(
  userId: number,
  limit: number,
): Promise<ApiMyActivityItem[]> {
  const rows = await getActivityRows(userId, limit);
  const titles = await getTitles(rows);
  return rows.map((row) => dtoMyActivityItem(row, titles));
}
