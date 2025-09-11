export function getLoggingForDataSource(
  env: string | undefined,
):
  | boolean
  | ("query" | "error" | "schema" | "warn" | "info" | "log" | "migration")[] {
  switch (env) {
    case "debug":
      return ["query", "error", "schema", "warn", "info", "log"];
    case "development":
      return ["error", "schema", "warn", "info", "log"];
    case "production":
      return ["error", "warn"];
    case "test":
      return false;
    default:
      return false;
  }
}
