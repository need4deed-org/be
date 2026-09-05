// Person.name (what's actually displayed, and what a user would search for)
// is a computed getter — firstName/middleName/lastName joined with a space,
// skipping any that are null — not a column. CONCAT_WS mirrors that exactly,
// so searching a full display name like "Jane Doe" matches, not just a
// single name part (a plain per-column firstName/lastName ILIKE OR can't).
export function personNameIlikeCondition(alias: string): string {
  return `CONCAT_WS(' ', ${alias}.firstName, ${alias}.middleName, ${alias}.lastName) ILIKE :search`;
}

// Escapes Postgres LIKE/ILIKE metacharacters (%, _, and the escape character
// itself) in user-supplied search input, so a literal "%" or "_" in a query
// is matched as text rather than treated as a wildcard.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
