export function orderByIds<T extends { id: number }>(
  ids: number[],
  rows: T[],
): T[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => rowsById.get(id))
    .filter((row): row is T => row !== undefined);
}
