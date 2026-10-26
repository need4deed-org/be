const PG_UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  const { name, code } = (error ?? {}) as { name?: string; code?: string };
  return name === "QueryFailedError" && code === PG_UNIQUE_VIOLATION;
}
