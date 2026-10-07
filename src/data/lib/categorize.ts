export function categorize<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }

  const uniqueItems = new Set(items);
  if (uniqueItems.size === 1) {
    return items[0];
  }

  const counts = new Map<T, number>();

  for (const item of items) {
    const newCount = (counts.get(item) || 0) + 1;
    counts.set(item, newCount);
  }

  const maxCount = Math.max(...counts.values());
  const [mostFrequentItem] = Array.from(counts.entries())
    .filter(([, count]) => count === maxCount)
    .map(([item]) => item);

  return mostFrequentItem;
}
