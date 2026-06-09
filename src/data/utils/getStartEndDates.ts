export function getStartEnd(
  startEnd: string,
): { start: Date; end: Date } | null {
  const map = {
    not: null,
    Nicht: null,
    verfügbar: null,
    available: null,
    "8:00 - 10:00": { startHour: 8, endHour: 11 }, // 8-11
    "10:00 - 12:00": { startHour: 11, endHour: 14 }, // 11-14
    "14:00 - 16:00": { startHour: 14, endHour: 17 }, // 14-17
    "16:00 - 18:00": { startHour: 14, endHour: 17 }, // 14-17
    "18:00 - 20:00": { startHour: 17, endHour: 20 }, // 17-20
    "8:00-11:00": { startHour: 8, endHour: 11 },
    "11:00-14:00": { startHour: 11, endHour: 14 },
    "12:00-14:00": { startHour: 11, endHour: 14 },
    "14:00-16:00": { startHour: 14, endHour: 17 },
    "14:00-17:00": { startHour: 14, endHour: 17 },
    "17:00-20:00": { startHour: 14, endHour: 17 },
    "08-11": { startHour: 8, endHour: 11 }, // 8-11
    "14-17": { startHour: 14, endHour: 17 }, // 14-17
    "17-20": { startHour: 17, endHour: 20 }, // 17-20
    "11-14": { startHour: 11, endHour: 14 }, // 11-14
    morning: { startHour: 8, endHour: 11 }, // 8-11
    noon: { startHour: 11, endHour: 14 }, // 11-14
    afternoon: { startHour: 14, endHour: 17 }, // 14-17
    evening: { startHour: 17, endHour: 20 }, // 17-20
  };

  if (!map[startEnd]) {
    return null;
  }

  const { startHour, endHour } = map[startEnd];

  const start = new Date(`2024-01-01 ${startHour}:00`);
  const end = new Date(`2024-01-01 ${endHour}:00`);

  return { start, end };
}
/*
"08-11"
"10.00-12.00"
"11-14"
"12.00-14.00"
"14-17"
"14.00-16.00"
"14:00-20:00"
"16.00-18.00"
"17-20"
"18.00-20.00"
"8.00-10.00"
"Nicht"
"Not"
"Weekdays"
"Weekends"
"afternoon"
"avai"
"availa"
"available"
"evening"
"morning"
"noon"
"v"
"ve"
"ver"
"verf"
"verfügbar"
*/
