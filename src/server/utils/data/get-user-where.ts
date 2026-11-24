import { UserRole } from "need4deed-sdk";
import { Raw } from "typeorm";
import { escapeLikePattern } from "./person-name-ilike";

const FULL_NAME =
  "CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.middle_name, ''), NULLIF(p.last_name, ''))";

function searchUserIds(search: string) {
  const words = search.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return undefined;
  }
  const params: Record<string, string> = {};
  const conditions = words.map((word, index) => {
    const key = `userSearch${index}`;
    params[key] = `%${escapeLikePattern(word)}%`;
    return `(u.email ILIKE :${key} OR ${FULL_NAME} ILIKE :${key})`;
  });
  return Raw(
    (alias) =>
      `${alias} IN (SELECT u.id FROM "public"."user" u ` +
      `LEFT JOIN "public"."person" p ON p.id = u.person_id ` +
      `WHERE ${conditions.join(" AND ")})`,
    params,
  );
}

export function getUserWhere(search?: string, role?: UserRole) {
  const id = search ? searchUserIds(search) : undefined;
  return {
    ...(role ? { role } : {}),
    ...(id ? { id } : {}),
  };
}
