import { CallerVisibility } from "./visible-persons";

type WithPostcode = { id: number | string; postcode: string | null };

export function hidePostcodeUnless<T extends WithPostcode>(
  item: T,
  visibility: CallerVisibility | null,
  visibleIds: (v: CallerVisibility) => Set<number>,
): T {
  if (!visibility || visibleIds(visibility).has(Number(item.id))) {
    return item;
  }
  return { ...item, postcode: null };
}
