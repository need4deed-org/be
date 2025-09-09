import { ApiLanguage, OccasionalType, VolunteerFormData } from "need4deed-sdk";

import Deal from "../../data/entity/deal.entity";
import Address from "../../data/entity/location/address.entity";
import District from "../../data/entity/location/district.entity";
import Location from "../../data/entity/location/location.entity";
import LocationDistrict from "../../data/entity/m2m/location-district";
import ProfileActivity from "../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import ProfileSkill from "../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Person from "../../data/entity/person.entity";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Profile from "../../data/entity/profile/profile.entity";
import Skill from "../../data/entity/profile/skill.entity";
import Time from "../../data/entity/time/time.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { DealType, TranslationEntityType } from "../../data/types";
import { getRRULE, getStartEnd } from "../../data/utils";
import {
  getPostcode,
  getProfileEntityByTitle,
  getTimeslot,
} from "../../server/utils";

export async function volunteerFormParser(
  formData: VolunteerFormData,
): Promise<Volunteer> {
  if (!formData) {
    throw new Error("No form data provided");
  }

  // postcode & address
  const postcode = await getPostcode(String(formData.postcode));
  const address = new Address({ postcode });

  // person
  const person = new Person({
    ...getNameFields(formData),
    email: formData.email,
    phone: formData.phone,
    address,
  });

  // activities
  const profileActivity: ProfileActivity[] = [];
  const volunteerActivities = (formData.activities || []) as string[];
  for (const volunteerActivity of volunteerActivities) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerActivity,
      TranslationEntityType.ACTIVITY,
      Activity,
      ProfileActivity,
    );
    if (profileEntity) {
      profileActivity.push(profileEntity);
    }
  }

  // skills
  const profileSkill: ProfileSkill[] = [];
  const volunteerSkills = (formData.skills || []) as string[];
  for (const volunteerSkill of volunteerSkills) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerSkill,
      TranslationEntityType.SKILL,
      Skill,
      ProfileSkill,
    );
    if (profileEntity) {
      profileSkill.push(profileEntity);
    }
  }

  // languages
  const profileLanguage: ProfileLanguage[] = [];

  const volunteerLanguages: ApiLanguage[] = formData.languages || [];
  for (const volunteerLanguage of volunteerLanguages) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerLanguage.title,
      TranslationEntityType.LANGUAGE,
      Language,
      ProfileLanguage,
    );

    if (profileEntity) {
      profileEntity.proficiency = volunteerLanguage.proficiency;
      profileLanguage.push(profileEntity);
    }
  }

  // profile
  const category = null;
  const profile = new Profile({
    category,
    profileActivity,
    profileSkill,
    profileLanguage,
  });

  // time
  const timeTimeslot: TimeTimeslot[] = [];
  const volunteerTimes = formData.schedule || [];
  for (const volunteerTime of volunteerTimes) {
    const [day, daytime] = volunteerTime;
    let timeframe: { start?: Date; end?: Date } = { start: null, end: null };
    let rrule: string = null;
    let occasional: OccasionalType = null;
    if (day) {
      timeframe = getStartEnd(daytime as string);
      const mapDay = [
        "",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ] as const;
      rrule = getRRULE(mapDay[Number(day)]);
    } else {
      occasional = daytime as OccasionalType;
    }
    const timeslot = await getTimeslot({ rrule, ...timeframe, occasional });
    const timeTimeslotEntry = new TimeTimeslot({ timeslot });
    timeTimeslot.push(timeTimeslotEntry);
  }

  const time = new Time({ timeTimeslot });

  // location
  const locationDistrict: LocationDistrict[] = [];
  const volunteerDistricts = (formData.districts || []) as string[];
  for (const volunteerDistrict of volunteerDistricts) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerDistrict,
      TranslationEntityType.NONE,
      District,
      LocationDistrict,
      "district",
    );
    if (profileEntity) {
      locationDistrict.push(profileEntity);
    }
  }
  const location = new Location({ locationDistrict });

  // deal
  const type = DealType.VOLUNTEER;
  const deal = new Deal({
    type,
    profile,
    postcode,
    time,
    location,
  });

  // volunteer
  const info = formData.comments || "";
  const statusVaccination = formData.measlesVaccination;
  const statusCGC = formData.goodConductCertificate;
  const volunteer = new Volunteer({
    info,
    person,
    deal,
    statusVaccination,
    statusCGC,
  });

  return volunteer;
}

function getNameFields(formData: VolunteerFormData) {
  const nameParts = formData.fullName.trim().split(" ");
  const firstName = nameParts[0] || "";
  const middleName =
    nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : null;
  const lastName =
    nameParts.length > 1 ? nameParts[nameParts.length - 1] : null;
  return { firstName, middleName, lastName };
}
