// A reply's `parentId` is either its root post's id (a direct, depth-1
// reply) or another reply's id (a depth-2 reply-to-a-reply, capped at one
// level — see post.routes.ts). Root posts (parentId/rootId both null) are
// never "direct replies".
export function isDirectPostReply(row: {
  parentId: number | null;
  rootId: number | null;
}): boolean {
  return row.parentId !== null && row.parentId === row.rootId;
}
