import { CallerVisibility } from "../pii/visible-persons";
import { dealOptionMatch } from "./option-search-sql";
import { escapeLikePattern } from "./person-name-ilike";

const PHONE_LIKE = /^[\d\s+()\-./]+$/;
const MIN_PHONE_DIGITS = 3;

type SqlIdFragment = {
  sql: string;
  params: Record<string, unknown>;
};

export function getVolunteerSearchFragment(
  search: string,
  visibility: CallerVisibility | null,
): SqlIdFragment {
  const digits = search.replace(/\D/g, "");
  const matchesPhoneDigits =
    PHONE_LIKE.test(search) && digits.length >= MIN_PHONE_DIGITS;

  const personMatch = [
    "CONCAT_WS(' ', NULLIF(p.first_name, ''), NULLIF(p.middle_name, ''), NULLIF(p.last_name, '')) ILIKE :searchPattern",
    "p.email ILIKE :searchPattern",
    "p.phone ILIKE :searchPattern",
    ...(matchesPhoneDigits
      ? ["regexp_replace(p.phone, '\\D', '', 'g') LIKE :searchDigits"]
      : []),
  ].join(" OR ");

  const conditions = [
    visibility
      ? `(p.id = ANY(:searchPersonIds) AND (${personMatch}))`
      : `(${personMatch})`,
    dealOptionMatch("v.deal_id", "deal_language", "language"),
    dealOptionMatch("v.deal_id", "deal_skill", "skill"),
    dealOptionMatch("v.deal_id", "deal_activity", "activity"),
    dealOptionMatch("v.deal_id", "deal_district", "district"),
    "EXISTS (SELECT 1 FROM agent a WHERE a.id = v.owner_agent_id AND a.title ILIKE :searchPattern)",
    // Free-text profile notes can hold personal details, so only staff search them.
    ...(visibility
      ? []
      : [
          "v.info_about ILIKE :searchPattern",
          "v.info_experience ILIKE :searchPattern",
        ]),
  ];

  return {
    sql: `SELECT v.id FROM volunteer v LEFT JOIN person p ON p.id = v.person_id WHERE ${conditions.join(" OR ")}`,
    params: {
      searchPattern: `%${escapeLikePattern(search)}%`,
      searchDigits: `%${digits}%`,
      searchPersonIds: visibility ? [...visibility.personIds] : [],
    },
  };
}
