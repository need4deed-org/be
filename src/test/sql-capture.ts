import { PostgresQueryRunner } from "typeorm/driver/postgres/PostgresQueryRunner";
import { vi } from "vitest";

const TO_MANY_JOIN =
  /JOIN (?:"[^"]+"\.)?"(deal_activity|deal_skill|deal_language|deal_timeslot|deal_district|opportunity_volunteer|agent_person|opportunity|user)"/g;

export async function captureSql(
  fn: () => Promise<unknown>,
): Promise<string[]> {
  const queries: string[] = [];
  const original = PostgresQueryRunner.prototype.query;
  const spy = vi
    .spyOn(PostgresQueryRunner.prototype, "query")
    .mockImplementation(function (
      this: PostgresQueryRunner,
      ...args: Parameters<PostgresQueryRunner["query"]>
    ) {
      queries.push(args[0]);
      return original.apply(this, args);
    } as PostgresQueryRunner["query"]);
  try {
    await fn();
  } finally {
    spy.mockRestore();
  }
  return queries;
}

export const maxToManyJoins = (queries: string[]): number =>
  Math.max(0, ...queries.map((q) => q.match(TO_MANY_JOIN)?.length ?? 0));
