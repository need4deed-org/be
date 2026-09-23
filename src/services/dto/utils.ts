import {
  ApiAvailability,
  ByDay,
  Occasionally,
  OccasionalType,
  OptionItem,
  TimeSlot,
  TranslatedIntoType,
} from "need4deed-sdk";
import DealLanguage from "../../data/entity/m2m/deal-language";
import DealTimeslot from "../../data/entity/m2m/deal-timeslot";

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
  if (!(byDay in ByDay)) {
    throw new Error("RRule BYDAY value is not recognized");
  }
  return ByDay[byDay as keyof typeof ByDay];
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
}

function formatSchedule(
  dealTimeslot: DealTimeslot[],
  labels: ScheduleLabels,
): string {
  return (
    getAvailability(dealTimeslot)
      ?.map(({ day, daytime }) => {
        if (day === Occasionally.OCCASIONALLY) {
          return (
            labels.occasional[daytime as OccasionalType] ?? String(daytime)
          );
        }
        // `day === null` (as opposed to undefined, which is the genuine
        // one-off-slot case below) means getByDay() couldn't find a BYDAY in
        // a weekly rrule — malformed data, not a date string to fall back to.
        if (day === null) {
          throw new Error(
            "Timeslot has a weekly rrule with no recognizable BYDAY",
          );
        }
        if (day) {
          const dayLabel = labels.day[day as ByDay] ?? String(day);
          const timeLabel =
            labels.timeSlot[daytime as TimeSlot] ?? String(daytime);
          return `${dayLabel}, ${timeLabel}`;
        }
        // one-off slot: daytime is already a localized date/time string
        return String(daytime);
      })
      .join(", ") ?? ""
  );
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

// German-only, matching this codebase's other notify-email content (see be#838).
export function formatScheduleDe(dealTimeslot: DealTimeslot[]): string {
  return formatSchedule(dealTimeslot, {
    day: DAY_LABELS_DE,
    timeSlot: TIME_SLOT_LABELS_DE,
    occasional: OCCASIONAL_LABELS_DE,
  });
}

const DAY_LABELS_BILINGUAL: Record<ByDay, string> = {
  [ByDay.MO]: "Montag/Monday",
  [ByDay.TU]: "Dienstag/Tuesday",
  [ByDay.WE]: "Mittwoch/Wednesday",
  [ByDay.TH]: "Donnerstag/Thursday",
  [ByDay.FR]: "Freitag/Friday",
  [ByDay.SA]: "Samstag/Saturday",
  [ByDay.SU]: "Sonntag/Sunday",
};

const TIME_SLOT_LABELS_NEUTRAL: Record<TimeSlot, string> = {
  [TimeSlot.morning]: "08:00–11:00",
  [TimeSlot.noon]: "11:00–14:00",
  [TimeSlot.afternoon]: "14:00–17:00",
  [TimeSlot.evening]: "17:00–20:00",
};

const OCCASIONAL_LABELS_BILINGUAL: Record<OccasionalType, string> = {
  [OccasionalType.WEEKDAYS]: "wochentags/on weekdays",
  [OccasionalType.WEEKENDS]: "am Wochenende/on weekends",
};

// For manifests that mix English and German in one flat body sharing a single
// placeholder across both language halves (e.g. suggestion.json) — see be#933.
export function formatScheduleBilingual(dealTimeslot: DealTimeslot[]): string {
  return formatSchedule(dealTimeslot, {
    day: DAY_LABELS_BILINGUAL,
    timeSlot: TIME_SLOT_LABELS_NEUTRAL,
    occasional: OCCASIONAL_LABELS_BILINGUAL,
  });
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

// Matches fe's own labels for these values (public/locales/de/translations.json).
const STANDALONE_LABELS: Record<TranslatedIntoType, string> = {
  [TranslatedIntoType.DEUTSCHE]: "Nur Deutsch",
  [TranslatedIntoType.ENGLISH_OK]: "Deutsch oder Englisch",
  [TranslatedIntoType.NO_TRANSLATION]: "Keine Sprachmittlung (Wegbegleitung)",
};
// The compact form of the target language(s), used only when there's an
// actual source language to pair it with.
const PAIR_TARGET_LABELS: Record<TranslatedIntoType, string> = {
  [TranslatedIntoType.DEUTSCHE]: "Deutsch",
  [TranslatedIntoType.ENGLISH_OK]: "Deutsch/Englisch",
  [TranslatedIntoType.NO_TRANSLATION]: "",
};

// Combines the accompanied person's translation-target requirement
// (languageToTranslate — which language(s) the interpreter must translate
// *into*) with the deal's requested source language(s) into a single
// "Target-Source" pair per language, e.g. "Deutsch-Arabisch" rather than
// showing them as two disconnected values ("Nur Deutsch, Arabisch") that
// read like unrelated facts instead of the interpretation pair a volunteer
// needs to cover. Falls back to the standalone label ("Nur Deutsch") when no
// source language is recorded, since a bare "Deutsch" alone would read as
// an incomplete pair rather than "German only, source unspecified".
export function formatAccompaniedPersonLanguage(
  languageToTranslate: TranslatedIntoType | undefined,
  dealLanguageTitles: string[],
): string {
  if (!languageToTranslate) {
    return "";
  }
  if (
    languageToTranslate === TranslatedIntoType.NO_TRANSLATION ||
    dealLanguageTitles.length === 0
  ) {
    return STANDALONE_LABELS[languageToTranslate];
  }
  const target = PAIR_TARGET_LABELS[languageToTranslate];
  return dealLanguageTitles.map((title) => `${target}-${title}`).join(", ");
}

// Shared by every accompanying/event notify email that renders a single
// onetimer.date — was independently duplicated across 5 files (fe#1036
// review); a future timezone/format change only needs to happen here.
export function formatOnetimerDate(date: Date | undefined): string {
  return date
    ? new Date(date).toLocaleDateString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";
}

export function formatOnetimerTime(date: Date | undefined): string {
  return date
    ? new Date(date).toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
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
