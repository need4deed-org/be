import { ObjectLiteral, Repository } from "typeorm";

export async function updateBackfilledColumn<
  T extends ObjectLiteral & { id: number },
>(repository: Repository<T>, rows: T[], column: keyof T & string) {
  await Promise.all(
    rows.map((row) =>
      repository.update(row.id, { [column]: row[column] } as Partial<T>),
    ),
  );
}
