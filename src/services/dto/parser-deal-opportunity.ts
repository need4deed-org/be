import {
  ApiLanguage,
  DealType,
  EntityTableName,
  LangPurpose,
  OccasionalType,
  OpportunityLegacyFormData,
} from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import Deal from "../../data/entity/deal.entity";
import District from "../../data/entity/location/district.entity";
import Location from "../../data/entity/location/location.entity";
import LocationDistrict from "../../data/entity/m2m/location-district";
import ProfileActivity from "../../data/entity/m2m/profile-activity";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import ProfileSkill from "../../data/entity/m2m/profile-skill";
import TimeTimeslot from "../../data/entity/m2m/time-timeslot";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Profile from "../../data/entity/profile/profile.entity";
import Skill from "../../data/entity/profile/skill.entity";
import Time from "../../data/entity/time/time.entity";
import Timeslot from "../../data/entity/time/timeslot.entity";
import {
  getPostcode,
  getRepository,
  getRRULE,
  getStartEnd,
} from "../../data/utils";
import logger from "../../logger";
import {
  getLanguageTitle,
  getProfileEntityByTitle,
  getTimeslot,
} from "../../server/utils";

export async function dealParserOpportunity(
  formData: OpportunityLegacyFormData,
): Promise<Deal> {
  // postcode
  const postcode = await getPostcode(String(formData.rac_plz));

  // activities
  const profileActivity: ProfileActivity[] = [];
  const opportunityActivities = (formData.activities || []) as string[];
  for (const opportunityActivity of opportunityActivities) {
    const profileEntity = await getProfileEntityByTitle(
      opportunityActivity,
      EntityTableName.ACTIVITY,
      Activity,
      ProfileActivity,
    );
    if (profileEntity) {
      profileActivity.push(profileEntity);
    }
  }

  // skills
  const profileSkill: ProfileSkill[] = [];
  const opportunitySkills = (formData.skills || []) as string[];
  for (const opportunitySkill of opportunitySkills) {
    const profileEntity = await getProfileEntityByTitle(
      opportunitySkill,
      EntityTableName.SKILL,
      Skill,
      ProfileSkill,
    );
    if (profileEntity) {
      profileSkill.push(profileEntity);
    }
  }

  // languages
  const profileLanguage: ProfileLanguage[] = [];

  const opportunityLanguages: ApiLanguage[] = (await Promise.all(
    (formData.languages || [])
      .map((l) => ({ isoCode: l, purpose: LangPurpose.RECIPIENT }))
      .map(async ({ isoCode, purpose }) => ({
        title: await getLanguageTitle(isoCode),
        purpose,
      })),
  )) as ApiLanguage[];

  for (const opportunityLanguage of opportunityLanguages) {
    const profileEntity = await getProfileEntityByTitle(
      opportunityLanguage.title,
      EntityTableName.LANGUAGE,
      Language,
      ProfileLanguage,
    );

    if (profileEntity) {
      profileEntity.proficiency = opportunityLanguage.proficiency;
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
  const opportunityTimes = formData.timeslots || [];
  for (const opportunityTime of opportunityTimes) {
    const [day, daytime] = opportunityTime;
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
      occasional = daytime.toLowerCase() as OccasionalType;
    }
    const timeslot = await getTimeslot({ rrule, ...timeframe, occasional });
    const timeTimeslotEntry = new TimeTimeslot({ timeslot });
    timeTimeslot.push(timeTimeslotEntry);
  }

  if (formData.onetime_date_time) {
    const timeslotRepository = getRepository(dataSource, Timeslot);
    const start = new Date(formData.onetime_date_time);
    const info = `One-time event on ${formData.onetime_date_time}`;
    const timeslot = await getTimeslot({
      start,
      info,
    });

    await timeslotRepository.save(timeslot); // TODO: check if id is undefined before saving
    logger.debug(`Created one-time timeslot: ${JSON.stringify(timeslot)}`);

    const timeTimeslotEntry = new TimeTimeslot({ timeslot });
    timeTimeslot.push(timeTimeslotEntry);
  }

  const time = new Time({ timeTimeslot });

  // location
  const locationDistrict: LocationDistrict[] = [];
  const volunteerDistricts = (formData.berlin_locations || []) as string[];
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
    profile,
    postcode,
    time,
    location,
  });

  return deal;
}
