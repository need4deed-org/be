const TRANSLATION_COLUMN: Record<string, string> = {
  language: "translated_language_id",
  skill: "skill_id",
  activity: "activity_id",
  agent_type: "agent_type_id",
  service: "service_id",
};

export function optionTitleMatch(alias: string, optionTable: string): string {
  const titleMatch = `${alias}.title ILIKE :searchPattern`;
  const translationColumn = TRANSLATION_COLUMN[optionTable];
  if (!translationColumn) {
    return titleMatch;
  }
  return `(${titleMatch} OR EXISTS (SELECT 1 FROM field_translation ft WHERE ft.${translationColumn} = ${alias}.id AND ft.translation ILIKE :searchPattern))`;
}

export const dealOptionMatch = (
  dealIdColumn: string,
  joinTable: string,
  optionTable: string,
) =>
  `EXISTS (SELECT 1 FROM ${joinTable} j JOIN ${optionTable} o ON o.id = j.${optionTable}_id WHERE j.deal_id = ${dealIdColumn} AND ${optionTitleMatch("o", optionTable)})`;
