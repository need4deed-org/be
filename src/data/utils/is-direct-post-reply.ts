export function isDirectPostReply(row: {
  parentId: number | null;
  rootId: number | null;
}): boolean {
  return row.parentId !== null && row.parentId === row.rootId;
}
