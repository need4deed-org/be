/**
  Categorizes a list of items based on their frequency.

  Args:
      items: A list of hashable items.

  Returns:
      - None if the input list is empty.
      - The single item if all items in the list are the same.
      - The most frequent item in the list.
      - The first item of the list if there is no single most frequent item
        (e.g., all items appear with the same frequency or the list has
        more than one item and no single item is strictly more frequent).
*/
export function categorize<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }

  const frequencyMap: Map<T, number> = new Map();
  for (const item of items) {
    frequencyMap.set(item, (frequencyMap.get(item) || 0) + 1);
  }

  const maxFrequency = Math.max(...frequencyMap.values());
  const mostFrequentItems = Array.from(frequencyMap.entries())
    .filter(([_, freq]) => freq === maxFrequency)
    .map(([item]) => item);

  if (mostFrequentItems.length === 1) {
    return mostFrequentItems[0];
  } else if (
    mostFrequentItems.length > 1 &&
    mostFrequentItems.length < items.length
  ) {
    return items[0];
  }

  return null;
}
