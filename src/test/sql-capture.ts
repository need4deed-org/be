import { PostgresQueryRunner } from "typeorm/driver/postgres/PostgresQueryRunner";
import { vi } from "vitest";

const TO_MANY_JOIN =
  /JOIN (?:"[^"]+"\.)?"(deal_activity|deal_skill|deal_language|deal_timeslot|deal_district|opportunity_volunteer|agent_person|opportunity|user|post_person|post_agent|post_opportunity)"/g;

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

function withoutExistsSubqueries(sql: string): string {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const at = sql.indexOf("EXISTS (", i);
    if (at === -1) {
      return out + sql.slice(i);
    }
    out += sql.slice(i, at);
    let depth = 0;
    let j = at + "EXISTS ".length;
    do {
      if (sql[j] === "(") {
        depth++;
      } else if (sql[j] === ")") {
        depth--;
      }
      j++;
    } while (depth > 0 && j < sql.length);
    i = j;
  }
  return out;
}

export const maxToManyJoins = (queries: string[]): number =>
  Math.max(
    0,
    ...queries.map(
      (q) => withoutExistsSubqueries(q).match(TO_MANY_JOIN)?.length ?? 0,
    ),
  );
