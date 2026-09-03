import { IsNull, Not } from "typeorm";

// A root post and a reply share the same `post` table and id space
// (parentId set = reply, null = root post) — every route scoped to one or
// the other must filter accordingly, or a reply's id could be used against
// a root-post-only route and vice versa.
export function getRootPostWhere(id: number) {
  return { id, parentId: IsNull() };
}

export function getPostReplyWhere(id: number) {
  return { id, parentId: Not(IsNull()) };
}
