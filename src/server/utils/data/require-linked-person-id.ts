import { BadRequestError } from "../../../config/error/fastify";

export function requireLinkedPersonId(personId: number | undefined): number {
  if (!personId) {
    throw new BadRequestError("No person linked to this user.");
  }
  return personId;
}
