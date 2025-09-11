import { ApiVolunteerGetList, ByDay, Daytime, Hour } from "need4deed-sdk";

import ProfileLanguage from "../../data/entity/m2m/profile-language";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Person from "../../data/entity/person.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";

export function volunteerSerializer(volunteer: Volunteer): ApiVolunteerGetList {
  return {
    name: getName(volunteer.person),
    languages: getLanguages(volunteer.deal.profile.profileLanguage),
    availability: getAvailability(volunteer.deal.time.timeTimeslot),
    activities: getTitles(volunteer.deal.profile.profileActivity, "activity"),
    skills: getTitles(volunteer.deal.profile.profileSkill, "skill"),
    locations: getTitles(volunteer.deal.location.locationDistrict, "district"),
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
  return `${person.firstName ?? ""}${
    person.middleName ? " " + person.middleName : ""
  } ${person.lastName ?? ""}`.trim();
}

function getLanguages(profileLanguage: ProfileLanguage[]) {
  return profileLanguage.map((pl) => ({
    title: pl.language.translation || pl.language.title,
    proficiency: pl.proficiency,
  }));
}

function getTitles<T>(profileItems: T[], entityName: string) {
  return profileItems.map(
    (pa) => pa[entityName].translation || pa[entityName].title,
  );
}
