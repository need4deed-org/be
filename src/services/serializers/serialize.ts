export function serialize<A, T>(items: T[], serializer: (item: T) => A): A[] {
  // TODO: Add validation here
  return items.map(serializer).filter(Boolean);
}
