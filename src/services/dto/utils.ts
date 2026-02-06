import {
  ApiAvailability,
  ByDay,
  Occasionally,
  OptionItem,
  TimeSlot,
} from "need4deed-sdk";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";

export function getAvailability(
  timeTimeslot: TimeTimeslot[],
): ApiAvailability[] {
  return timeTimeslot?.map(({ timeslot }): ApiAvailability => {
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
        day: getByDay(timeslot.rrule),
        daytime: getTimeSlotForDaytime(timeslot.start, timeslot.end),
      };
    }

    throw new Error("Timeslot is lacking required fields");
  });
}

export function getByDay(rrule: string): ByDay {
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

export function getLanguages(profileLanguage: ProfileLanguage[]) {
  return profileLanguage?.map((pl) => ({
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

export function getTitles<T>(profileItems: T[], entityName: string) {
  return profileItems?.map(
    (pa) => pa[entityName].translation || pa[entityName].title,
  );
}
