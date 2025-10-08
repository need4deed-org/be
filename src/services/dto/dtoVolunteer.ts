import {
  Address,
  ApiVolunteerGet,
  ApiVolunteerGetList,
  Availability,
  ByDay,
  Daytime,
  Hour,
  Occasionally,
  OptionItem,
  TimedText,
} from "need4deed-sdk";

import ProfileLanguage from "../../data/entity/m2m/profile-language";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Timeline from "../../data/entity/timeline.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { fastify } from "../../server";

const city = "Berlin";

export function volunteerListSerializer(
  volunteer: Volunteer,
): ApiVolunteerGetList {
  try {
    const id = volunteer.id;
    const status = volunteer.status;
    const name = volunteer.person.name;
    const avatarUrl = volunteer.person?.avatarUrl || null;
    const languages = getLanguages(volunteer.deal.profile.profileLanguage);
    const availability = getAvailability(volunteer.deal.time.timeTimeslot);
    const activities = getTitles(
      volunteer.deal.profile.profileActivity,
      "activity",
    );
    const skills = getTitles(volunteer.deal.profile.profileSkill, "skill");
    const locations = getTitles(
      volunteer.deal.location.locationDistrict,
      "district",
    );
    return {
      id,
      status,
      name,
      avatarUrl,
      languages,
      availability,
      activities,
      skills,
      locations,
    };
  } catch (error) {
    fastify.log.error(
      `Error serializing volunteer (id:${volunteer.id}): ${error}`,
    );
  }
}

export function volunteerSerializer(
  volunteer: Volunteer,
  timedEvents: Timeline[],
): ApiVolunteerGet {
  const address: Address = {
    ...volunteer.person.address,
    id: String(volunteer.person.address.id),
    city,
    postcode: {
      ...volunteer.person.address.postcode,
      id: String(volunteer.person.address.postcode.id),
      code: volunteer.person.address.postcode.value,
      latitude: volunteer.person.address.postcode.latitude || null,
      longitude: volunteer.person.address.postcode.longitude || null,
    },
  };

  const comments: TimedText[] = timedEvents
    .filter(({ contentType }) => contentType === "comment")
    .map(({ id, timestamp, content }) => ({
      id,
      timestamp,
      content,
    }));
  const timelineLogs: TimedText[] = timedEvents
    .filter(({ contentType }) => contentType !== "comment")
    .map(({ id, timestamp, content }) => ({
      id,
      timestamp,
      content,
    }));
  const personId = volunteer.person.id;
  const email = volunteer.person.email;
  const firstName = volunteer.person.firstName;
  const goodConductCertificate = volunteer.statusCGC;
  const infoAbout = volunteer.infoAbout;
  const infoExperience = volunteer.infoExperience;
  const lastName = volunteer.person.lastName;
  const measlesVaccination = volunteer.statusVaccination;
  const opportunitiesApplied = [] as unknown as OptionItem[];
  const opportunitiesMatched = [] as unknown as OptionItem[];
  const phone = volunteer.person.phone;
  const createdAt = volunteer.createdAt;
  const updatedAt = volunteer.updatedAt;
  const activities = getOptionItems(
    volunteer.deal.profile.profileActivity,
    "activity",
  );
  const skills = getOptionItems(volunteer.deal.profile.profileSkill, "skill");
  const locations = getOptionItems(
    volunteer.deal.location.locationDistrict,
    "district",
  );
  const languages = getLanguages(volunteer.deal.profile.profileLanguage);
  const availability = getAvailability(volunteer.deal.time.timeTimeslot);

  return {
    id: volunteer.id,
    status: volunteer.status,
    personId,
    avatarUrl: volunteer.person?.avatarUrl || null,
    name: volunteer.person.name,
    address,
    comments,
    email,
    firstName,
    goodConductCertificate,
    infoAbout,
    infoExperience,
    lastName,
    measlesVaccination,
    opportunitiesApplied,
    opportunitiesMatched,
    phone,
    timelineLogs,
    createdAt,
    updatedAt,
    languages,
    availability,
    activities,
    skills,
    locations,
  };
}

function getByDay(rrule: string): ByDay {
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

function getHour(date: Date): Hour {
  if (!date) {
    throw new Error("Date is required to get hour");
  }
  const hour = `H${String(date.getHours()).padStart(2, "0")}`;
  return Hour[hour];
}

function getAvailability(timeTimeslot: TimeTimeslot[]): Availability[] {
  return timeTimeslot.map(({ timeslot }): Availability => {
    if (timeslot?.rrule && timeslot?.start && timeslot?.end) {
      return {
        timeslotId: timeslot.id,
        day: getByDay(timeslot.rrule),
        daytime: [getHour(timeslot.start), getHour(timeslot.end)] as Daytime,
      } as Availability;
    }
    if (timeslot?.occasional) {
      return {
        timeslotId: timeslot.id,
        day: Occasionally.OCCASIONALLY,
        daytime: [timeslot.occasional],
      } as Availability;
    }

    throw new Error("Timeslot is missing required fields");
  });
}

function getLanguages(profileLanguage: ProfileLanguage[]) {
  return profileLanguage.map((pl) => ({
    languageId: pl.language.id,
    title: pl.language.translation || pl.language.title,
    proficiency: pl.proficiency,
  }));
}

function getOptionItems<T>(
  profileItems: T[],
  entityName: string,
): OptionItem[] {
  return profileItems.map((pa) => ({
    id: pa[entityName].id,
    title: pa[entityName].translation || pa[entityName].title,
  }));
}

function getTitles<T>(profileItems: T[], entityName: string) {
  return profileItems.map(
    (pa) => pa[entityName].translation || pa[entityName].title,
  );
}
