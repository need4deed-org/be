export function serialize<A, T>(items: T[], serializer: (item: T) => A): A[] {
  return items.map(serializer);
}
