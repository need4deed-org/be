import { BadRequestError } from "../../../config/error/fastify";

// Every mutation in post.routes.ts needs the authenticated user to have a
// linked Person record before writing anything authorId/personId-keyed.
export function requireLinkedPersonId(personId: number | undefined): number {
  if (!personId) {
    throw new BadRequestError("No person linked to this user.");
  }
  return personId;
}
