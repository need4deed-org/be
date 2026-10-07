import { IsNull, Not } from "typeorm";

export function getRootPostWhere(id: number) {
  return { id, parentId: IsNull() };
}

export function getPostReplyWhere(id: number) {
  return { id, parentId: Not(IsNull()) };
}
