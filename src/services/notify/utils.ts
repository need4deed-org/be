const berlinDateTimeFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatBerlinTimestamp(d: Date = new Date()): string {
  return berlinDateTimeFormat.format(d);
}
