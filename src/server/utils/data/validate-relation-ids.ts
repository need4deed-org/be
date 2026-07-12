import { BadRequestError } from "../../../config";

export function validateRelationIds(
  requestedIds: number[],
  foundEntities: { id: number }[],
  label: string,
): void {
  const existingIds = new Set(foundEntities.map((e) => e.id));
  const missing = [...new Set(requestedIds)].filter(
    (id) => !existingIds.has(id),
  );
  if (missing.length) {
    throw new BadRequestError(`Invalid ${label} id(s): ${missing.join(", ")}`);
  }
}
