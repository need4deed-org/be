import {
  ApiAvailability,
  ByDay,
  Lang,
  Occasionally,
  OccasionalType,
  OptionItem,
  TimeSlot,
  TranslatedIntoType,
} from "need4deed-sdk";
import { berlinTimeZone } from "../../config";
import DealLanguage from "../../data/entity/m2m/deal-language";
import DealTimeslot from "../../data/entity/m2m/deal-timeslot";
import { isByDayCode } from "../../data/utils/by-day-code";

export function getAvailability(
  dealTimeslot: DealTimeslot[],
): ApiAvailability[] {
  return dealTimeslot?.map(({ timeslot }): ApiAvailability => {
    if (timeslot?.occasional) {
      return {
        id: timeslot.id,
        day: Occasionally.OCCASIONALLY,
        daytime: timeslot.occasional,
      };
    }
    if (timeslot?.rrule && timeslot?.start && timeslot?.end) {
      return {
        id: timeslot.id,
        day: getByDay(timeslot.rrule)!,
        daytime: getTimeSlotForDaytime(timeslot.start, timeslot.end),
      };
    }
    if (!timeslot?.occasional && !timeslot?.rrule && timeslot?.start) {
      return {
        id: timeslot.id,
        daytime: new Date(timeslot.start).toLocaleString("de-DE", {
          timeZone: berlinTimeZone,
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }

    throw new Error("Timeslot is lacking required fields");
  });
}

export function getByDay(rrule: string): ByDay | null {
  if (!rrule) {
    throw new Error("RRule is required to get ByDay");
  }
  const byDayPos = rrule.indexOf("BYDAY") + 6;
  if (byDayPos < 6) {
    return null;
  }
  const byDay = rrule.slice(byDayPos, byDayPos + 2);
  if (!isByDayCode(byDay)) {
    throw new Error("RRule BYDAY value is not recognized");
  }
  return ByDay[byDay];
}

export function getTimeSlotForDaytime(start: Date, end: Date): TimeSlot {
  if (!start || !end) {
    throw new Error("Start and end dates are required to get TimeSlot");
  }
  const timeslot = `${start.getHours().toString().padStart(2, "0")}-${end.getHours().toString().padStart(2, "0")}`;

  if (Object.values(TimeSlot).includes(timeslot as TimeSlot)) {
    return timeslot as TimeSlot;
  }

  throw new Error("From or To hour value is not supported");
}

interface ScheduleLabels {
  day: Record<ByDay, string>;
  timeSlot: Record<TimeSlot, string>;
  occasional: Record<OccasionalType, string>;
  and: string;
  dayRange: string;
}

const SENTENCE_THRESHOLD = 3;
const MIN_DAY_RANGE = 3;
const WEEK = Object.values(ByDay);
const TIME_SLOTS = Object.values(TimeSlot);

function formatSlot(
  { day, daytime }: ApiAvailability,
  labels: ScheduleLabels,
): string {
  if (day === Occasionally.OCCASIONALLY) {
    return labels.occasional[daytime as OccasionalType] ?? String(daytime);
  }
  if (day === null) {
    throw new Error("Timeslot has a weekly rrule with no recognizable BYDAY");
  }
  if (day) {
    const dayLabel = labels.day[day] ?? String(day);
    const timeLabel = labels.timeSlot[daytime as TimeSlot] ?? String(daytime);
    return `${dayLabel}, ${timeLabel}`;
  }
  return String(daytime);
}

function joinWithAnd(parts: string[], and: string): string {
  return parts.length <= 1
    ? parts.join("")
    : `${parts.slice(0, -1).join(", ")} ${and} ${parts.at(-1)}`;
}

function joinDays(days: ByDay[], labels: ScheduleLabels): string {
  const runs: ByDay[][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && WEEK.indexOf(day) === WEEK.indexOf(run.at(-1)!) + 1) {
      run.push(day);
    } else {
      runs.push([day]);
    }
  }
  const parts = runs.flatMap((run) =>
    run.length >= MIN_DAY_RANGE
      ? [`${labels.day[run[0]]} ${labels.dayRange} ${labels.day[run.at(-1)!]}`]
      : run.map((day) => labels.day[day]),
  );
  return joinWithAnd(parts, labels.and);
}

function isWeeklySlot(
  slot: ApiAvailability,
): slot is { day: ByDay; daytime: TimeSlot } {
  return (
    WEEK.includes(slot.day as ByDay) &&
    TIME_SLOTS.includes(slot.daytime as TimeSlot)
  );
}

function formatScheduleSentence(
  availability: ApiAvailability[],
  labels: ScheduleLabels,
): string {
  const slotsByDay = new Map<ByDay, Set<TimeSlot>>();
  const others: string[] = [];
  for (const slot of availability) {
    if (isWeeklySlot(slot)) {
      const slots = slotsByDay.get(slot.day) ?? new Set<TimeSlot>();
      slotsByDay.set(slot.day, slots.add(slot.daytime));
    } else {
      others.push(formatSlot(slot, labels));
    }
  }

  const groups = new Map<string, { days: ByDay[]; slots: TimeSlot[] }>();
  for (const day of WEEK) {
    const daySlots = slotsByDay.get(day);
    if (!daySlots) {
      continue;
    }
    const slots = TIME_SLOTS.filter((slot) => daySlots.has(slot));
    const key = slots.join();
    const group = groups.get(key) ?? { days: [], slots };
    group.days.push(day);
    groups.set(key, group);
  }

  const weekly = [...groups.values()].map(
    ({ days, slots }) =>
      `${joinDays(days, labels)}, ${joinWithAnd(
        slots.map((slot) => labels.timeSlot[slot]),
        labels.and,
      )}`,
  );
  return [...weekly, ...others].join("; ");
}

function formatSchedule(
  dealTimeslot: DealTimeslot[],
  labels: ScheduleLabels,
): string {
  const availability = getAvailability(dealTimeslot) ?? [];
  if (availability.length > SENTENCE_THRESHOLD) {
    return formatScheduleSentence(availability, labels);
  }
  return availability.map((slot) => formatSlot(slot, labels)).join(", ");
}

const DAY_LABELS_DE: Record<ByDay, string> = {
  [ByDay.MO]: "Montag",
  [ByDay.TU]: "Dienstag",
  [ByDay.WE]: "Mittwoch",
  [ByDay.TH]: "Donnerstag",
  [ByDay.FR]: "Freitag",
  [ByDay.SA]: "Samstag",
  [ByDay.SU]: "Sonntag",
};

const TIME_SLOT_LABELS_DE: Record<TimeSlot, string> = {
  [TimeSlot.morning]: "08–11 Uhr",
  [TimeSlot.noon]: "11–14 Uhr",
  [TimeSlot.afternoon]: "14–17 Uhr",
  [TimeSlot.evening]: "17–20 Uhr",
};

const OCCASIONAL_LABELS_DE: Record<OccasionalType, string> = {
  [OccasionalType.WEEKDAYS]: "gelegentlich, wochentags",
  [OccasionalType.WEEKENDS]: "gelegentlich, am Wochenende",
};

export function formatScheduleDe(dealTimeslot: DealTimeslot[]): string {
  return formatSchedule(dealTimeslot, {
    day: DAY_LABELS_DE,
    timeSlot: TIME_SLOT_LABELS_DE,
    occasional: OCCASIONAL_LABELS_DE,
    and: "und",
    dayRange: "bis",
  });
}

const DAY_LABELS_EN: Record<ByDay, string> = {
  [ByDay.MO]: "Monday",
  [ByDay.TU]: "Tuesday",
  [ByDay.WE]: "Wednesday",
  [ByDay.TH]: "Thursday",
  [ByDay.FR]: "Friday",
  [ByDay.SA]: "Saturday",
  [ByDay.SU]: "Sunday",
};

const TIME_SLOT_LABELS_NEUTRAL: Record<TimeSlot, string> = {
  [TimeSlot.morning]: "08:00–11:00",
  [TimeSlot.noon]: "11:00–14:00",
  [TimeSlot.afternoon]: "14:00–17:00",
  [TimeSlot.evening]: "17:00–20:00",
};

const OCCASIONAL_LABELS_EN: Record<OccasionalType, string> = {
  [OccasionalType.WEEKDAYS]: "on weekdays",
  [OccasionalType.WEEKENDS]: "on weekends",
};

const OCCASIONAL_LABELS_DE_SHORT: Record<OccasionalType, string> = {
  [OccasionalType.WEEKDAYS]: "wochentags",
  [OccasionalType.WEEKENDS]: "am Wochenende",
};

export function formatScheduleLocalized(
  dealTimeslot: DealTimeslot[],
): Record<Lang, string> {
  return {
    [Lang.EN]: formatSchedule(dealTimeslot, {
      day: DAY_LABELS_EN,
      timeSlot: TIME_SLOT_LABELS_NEUTRAL,
      occasional: OCCASIONAL_LABELS_EN,
      and: "and",
      dayRange: "to",
    }),
    [Lang.DE]: formatSchedule(dealTimeslot, {
      day: DAY_LABELS_DE,
      timeSlot: TIME_SLOT_LABELS_NEUTRAL,
      occasional: OCCASIONAL_LABELS_DE_SHORT,
      and: "und",
      dayRange: "bis",
    }),
  };
}

export function getLanguages(dealLanguage: DealLanguage[]) {
  return dealLanguage?.map((pl) => ({
    id: pl.language.id,
    title: pl.language.translation || pl.language.title,
    proficiency: pl.proficiency,
  }));
}

export function getOptionItems<T>(
  profileItems: T[],
  entityName: string,
): OptionItem[] {
  return profileItems?.map((pa) => ({
    id: pa[entityName].id,
    title: pa[entityName].translation || pa[entityName].title,
  }));
}

export function getCoordinates(postcode?: {
  latitude?: number | null;
  longitude?: number | null;
}): { latitude: number | null; longitude: number | null } {
  return {
    latitude: postcode?.latitude ?? null,
    longitude: postcode?.longitude ?? null,
  };
}

const STANDALONE_LABELS: Record<Lang, Record<TranslatedIntoType, string>> = {
  [Lang.DE]: {
    [TranslatedIntoType.DEUTSCHE]: "Nur Deutsch",
    [TranslatedIntoType.ENGLISH_OK]: "Deutsch oder Englisch",
    [TranslatedIntoType.NO_TRANSLATION]: "Keine Sprachmittlung (Wegbegleitung)",
  },
  [Lang.EN]: {
    [TranslatedIntoType.DEUTSCHE]: "Only German",
    [TranslatedIntoType.ENGLISH_OK]: "German or English",
    [TranslatedIntoType.NO_TRANSLATION]: "No translation",
  },
};
const PAIR_TARGET_LABELS: Record<Lang, Record<TranslatedIntoType, string>> = {
  [Lang.DE]: {
    [TranslatedIntoType.DEUTSCHE]: "Deutsch",
    [TranslatedIntoType.ENGLISH_OK]: "Deutsch/Englisch",
    [TranslatedIntoType.NO_TRANSLATION]: "",
  },
  [Lang.EN]: {
    [TranslatedIntoType.DEUTSCHE]: "German",
    [TranslatedIntoType.ENGLISH_OK]: "German/English",
    [TranslatedIntoType.NO_TRANSLATION]: "",
  },
};

export function formatAccompaniedPersonLanguage(
  languageToTranslate: TranslatedIntoType | undefined,
  dealLanguageTitles: string[],
  lang: Lang = Lang.DE,
): string {
  if (!languageToTranslate) {
    return "";
  }
  if (
    languageToTranslate === TranslatedIntoType.NO_TRANSLATION ||
    dealLanguageTitles.length === 0
  ) {
    return STANDALONE_LABELS[lang][languageToTranslate];
  }
  const target = PAIR_TARGET_LABELS[lang][languageToTranslate];
  return dealLanguageTitles.map((title) => `${target}-${title}`).join(", ");
}

export function formatOnetimerDate(date: Date | undefined): string {
  return date
    ? new Date(date).toLocaleDateString("de-DE", {
        timeZone: berlinTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
}

export function formatOnetimerTime(date: Date | undefined): string {
  return date
    ? new Date(date).toLocaleTimeString("de-DE", {
        timeZone: berlinTimeZone,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

export function getNameFields(name: string) {
  const names = name.split(" ");

  return {
    firstName: names.shift() || undefined,
    lastName: names.pop() || undefined,
    middleName: names.join(" ") || undefined,
  };
}
