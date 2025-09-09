export function getRRULE(day: string): string | null {
  if (
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].includes(day.toLowerCase())
  ) {
    return `FREQ=WEEKLY;BYDAY=${day.slice(0, 2).toUpperCase()};`;
  }

  return null;
}
