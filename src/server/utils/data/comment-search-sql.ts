import { EntityTableName } from "need4deed-sdk";

export const commentMatch = (entityType: EntityTableName, idColumn: string) =>
  `EXISTS (SELECT 1 FROM comment c WHERE c.entity_type = '${entityType}' AND c.entity_id = ${idColumn} AND c.text ILIKE :searchPattern)`;
