import { LangProficiency } from "need4deed-sdk";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Person from "../../data/entity/person.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { ByDay, Daytime, Hour, VolunteerAPI } from "../../server/types";

export function volunteerSerializer(volunteer: Volunteer): VolunteerAPI {
  return {
    name: getName(volunteer.person),
    phone: volunteer.person.phone,
    email: volunteer.person.email,
    nativeLanguages: getLanguages(
      volunteer.deal.profile.profileLanguage,
      LangProficiency.NATIVE,
    ),
    fluentLanguages: getLanguages(
      volunteer.deal.profile.profileLanguage,
      LangProficiency.FLUENT,
    ),
    intermediateLanguages: getLanguages(
      volunteer.deal.profile.profileLanguage,
      LangProficiency.INTERMEDIATE,
    ),
    availability: getAvailability(volunteer.deal.time.timeTimeslot),
    activities: getTitles(volunteer.deal.profile.profileActivity, "activity"),
    skills: getTitles(volunteer.deal.profile.profileSkill, "skill"),
  };
}

function getByDay(rrule: string): ByDay {
  const byDayPos = rrule.indexOf("BYDAY") + 6;
  if (byDayPos < 6) {
    return null;
  }
  const byDay = rrule.slice(byDayPos, byDayPos + 2);
  if (!(byDay in ByDay)) {
    return null;
  }
  return ByDay[byDay];
}

function getHour(date: Date): Hour {
  const hour = `H${String(date.getHours()).padStart(2, "0")}`;
  return Hour[hour];
}

function getAvailability(timeTimeslot: TimeTimeslot[]) {
  return timeTimeslot.map(({ timeslot }) => ({
    day: getByDay(timeslot.rrule),
    daytime: [getHour(timeslot.start), getHour(timeslot.end)] as Daytime,
  }));
}

function getName(person: Person) {
  return `${person.firstName}${
    person.middleName ? " " + person.middleName : ""
  } ${person.lastName}`.trim();
}

function getLanguages(
  profileLanguage: ProfileLanguage[],
  proficiency: LangProficiency,
) {
  return profileLanguage
    .filter((pl) => pl.proficiency === proficiency)
    .map((pl) => pl.language.title);
}

function getTitles<T>(profileItems: T[], entityName: string) {
  return profileItems.map((pa) => pa[entityName].title);
}
