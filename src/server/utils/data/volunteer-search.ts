import { CallerVisibility } from "../pii/visible-persons";
import { escapeLikePattern } from "./person-name-ilike";

const PHONE_LIKE = /^[\d\s+()\-./]+$/;
const MIN_PHONE_DIGITS = 3;

export type SqlIdFragment = {
  sql: string;
  params: Record<string, unknown>;
};

const dealOptionMatch = (joinTable: string, optionTable: string) =>
  `EXISTS (SELECT 1 FROM ${joinTable} j JOIN ${optionTable} o ON o.id = j.${optionTable}_id WHERE j.deal_id = v.deal_id AND o.title ILIKE :searchPattern)`;

export function getVolunteerSearchFragment(
  search: string,
  visibility: CallerVisibility | null,
): SqlIdFragment {
  const digits = search.replace(/\D/g, "");
  const matchesPhoneDigits =
    PHONE_LIKE.test(search) && digits.length >= MIN_PHONE_DIGITS;

  const personMatch = [
    "p.first_name ILIKE :searchPattern",
    "p.last_name ILIKE :searchPattern",
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
    dealOptionMatch("deal_language", "language"),
    dealOptionMatch("deal_skill", "skill"),
    dealOptionMatch("deal_activity", "activity"),
    dealOptionMatch("deal_district", "district"),
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
