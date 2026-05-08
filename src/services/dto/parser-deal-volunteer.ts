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
import LocationDistrict from "../../data/entity/m2m/location-district";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Skill from "../../data/entity/profile/skill.entity";
import Time from "../../data/entity/time/time.entity";
import { getRRULE, getStartEnd } from "../../data/utils";
import {
  getDealEntityByTitle,
  getPostcode,
  getTimeslot,
} from "../../server/utils";

export async function dealParser(formData: VolunteerFormData): Promise<Deal> {
  // postcode
  const postcode = await getPostcode(String(formData.postcode));

  // activities
  const dealActivity: DealActivity[] = [];
  const volunteerActivities = (formData.activities || []) as string[];
  for (const volunteerActivity of volunteerActivities) {
    const dealEntity = await getDealEntityByTitle(
      volunteerActivity,
      EntityTableName.ACTIVITY,
      Activity,
      DealActivity,
    );
    if (dealEntity) {
      dealActivity.push(dealEntity);
    }
  }

  // skills
  const dealSkill: DealSkill[] = [];
  const volunteerSkills = (formData.skills || []) as string[];
  for (const volunteerSkill of volunteerSkills) {
    const dealEntity = await getDealEntityByTitle(
      volunteerSkill,
      EntityTableName.SKILL,
      Skill,
      DealSkill,
    );
    if (dealEntity) {
      dealSkill.push(dealEntity);
    }
  }

  // languages
  const dealLanguage: DealLanguage[] = [];

  const volunteerLanguages: ApiLanguage[] = formData.languages || [];
  for (const volunteerLanguage of volunteerLanguages) {
    const dealEntity = await getDealEntityByTitle(
      volunteerLanguage.title,
      EntityTableName.LANGUAGE,
      Language,
      DealLanguage,
    );

    if (dealEntity) {
      dealEntity.proficiency = volunteerLanguage.proficiency;
      dealLanguage.push(dealEntity);
    }
  }

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
    const dealEntity = await getDealEntityByTitle(
      volunteerDistrict,
      EntityTableName.NONE,
      District,
      LocationDistrict,
      "district",
    );
    if (dealEntity) {
      locationDistrict.push(dealEntity);
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
    postcode,
    time,
    location,
  });

  return deal;
}
