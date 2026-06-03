import {
  ApiLanguage,
  DealType,
  EntityTableName,
  OccasionalType,
  VolunteerFormData,
} from "need4deed-sdk";
import Deal from "../../data/entity/deal.entity";
import District from "../../data/entity/location/district.entity";
import Location from "../../data/entity/location/location.entity";
import DealActivity from "../../data/entity/m2m/deal-activity";
import DealLanguage from "../../data/entity/m2m/deal-language";
import DealSkill from "../../data/entity/m2m/deal-skill";
import DealTimeslot from "../../data/entity/m2m/deal-timeslot";
import LocationDistrict from "../../data/entity/m2m/location-district";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Skill from "../../data/entity/profile/skill.entity";
import { getPostcode, getRRULE, getStartEnd } from "../../data/utils";
import { getProfileEntityByTitle, getTimeslot } from "../../server/utils";

export async function dealParser(formData: VolunteerFormData): Promise<Deal> {
  // postcode
  const postcode = await getPostcode(String(formData.postcode));

  // activities
  const dealActivity: DealActivity[] = [];
  const volunteerActivities = (formData.activities || []) as string[];
  for (const volunteerActivity of volunteerActivities) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerActivity,
      EntityTableName.ACTIVITY,
      Activity,
      DealActivity,
    );
    if (profileEntity) {
      dealActivity.push(profileEntity);
    }
  }

  // skills
  const dealSkill: DealSkill[] = [];
  const volunteerSkills = (formData.skills || []) as string[];
  for (const volunteerSkill of volunteerSkills) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerSkill,
      EntityTableName.SKILL,
      Skill,
      DealSkill,
    );
    if (profileEntity) {
      dealSkill.push(profileEntity);
    }
  }

  // languages
  const dealLanguage: DealLanguage[] = [];

  const volunteerLanguages: ApiLanguage[] = formData.languages || [];
  for (const volunteerLanguage of volunteerLanguages) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerLanguage.title,
      EntityTableName.LANGUAGE,
      Language,
      DealLanguage,
    );

    if (profileEntity) {
      profileEntity.proficiency = volunteerLanguage.proficiency;
      dealLanguage.push(profileEntity);
    }
  }

  // time
  const dealTimeslot: DealTimeslot[] = [];
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
    const dealTimeslotEntry = new DealTimeslot({ timeslot });
    dealTimeslot.push(dealTimeslotEntry);
  }

  // location
  const locationDistrict: LocationDistrict[] = [];
  const volunteerDistricts = (formData.districts || []) as string[];
  for (const volunteerDistrict of volunteerDistricts) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerDistrict,
      EntityTableName.NONE,
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
    dealActivity,
    dealSkill,
    dealLanguage,
    dealTimeslot,
    postcode,
    location,
  });

  return deal;
}
