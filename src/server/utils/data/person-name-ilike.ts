// Person.name (what's actually displayed, and what a user would search for)
// is a computed getter — firstName/middleName/lastName joined with a space,
// skipping any that are null OR empty ("" filtered out via .filter(Boolean))
// — not a column. CONCAT_WS only skips NULL, not "", and middleName can be
// persisted as "" rather than NULL (e.g. update-agent-contact.ts), so each
// part is wrapped in NULLIF(..., '') first to turn "" into NULL and match
// the getter's semantics exactly, letting a full display name like
// "Jane Doe" match (a plain per-column firstName/lastName ILIKE OR can't).
export function personNameIlikeCondition(alias: string): string {
  return (
    `CONCAT_WS(' ', NULLIF(${alias}.firstName, ''), ` +
    `NULLIF(${alias}.middleName, ''), NULLIF(${alias}.lastName, '')) ILIKE :search`
  );
}

// Escapes Postgres LIKE/ILIKE metacharacters (%, _, and the escape character
// itself) in user-supplied search input, so a literal "%" or "_" in a query
// is matched as text rather than treated as a wildcard.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
