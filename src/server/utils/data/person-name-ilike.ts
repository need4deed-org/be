export function personNameIlikeCondition(alias: string): string {
  return (
    `CONCAT_WS(' ', NULLIF(${alias}.firstName, ''), ` +
    `NULLIF(${alias}.middleName, ''), NULLIF(${alias}.lastName, '')) ILIKE :search`
  );
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
