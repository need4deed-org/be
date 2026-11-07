import { CallerVisibility } from "./visible-persons";

export function isOwnAddressVisible(
  visibility: CallerVisibility | null,
  opportunityId: number,
): boolean {
  return visibility === null || visibility.opportunityIds.has(opportunityId);
}
