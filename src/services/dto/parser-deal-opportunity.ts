import {
  ApiLanguage,
  DealType,
  EntityTableName,
  LangPurpose,
  OccasionalType,
  OpportunityLegacyFormData,
  TranslatedIntoType,
} from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
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
import Timeslot from "../../data/entity/time/timeslot.entity";
import { getRepository, getRRULE, getStartEnd } from "../../data/utils";
import logger from "../../logger";
import {
  getDealEntityByTitle,
  getLanguageTitle,
  getPostcode,
  getTimeslot,
} from "../../server/utils";

export async function dealParserOpportunity(
  formData: OpportunityLegacyFormData,
): Promise<Deal> {
  // postcode
  const postcode = await getPostcode(String(formData.rac_plz));

  // activities
  const dealActivity: DealActivity[] = [];
  const opportunityActivities = (formData.activities || []) as string[];
  for (const opportunityActivity of opportunityActivities) {
    const dealEntity = await getDealEntityByTitle(
      opportunityActivity,
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
  const opportunitySkills = (formData.skills || []) as string[];
  for (const opportunitySkill of opportunitySkills) {
    const dealEntity = await getDealEntityByTitle(
      opportunitySkill,
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

  const opportunityLanguages: ApiLanguage[] = (await Promise.all(
    (formData.languages || [])
      .map((l) => ({ isoCode: l, purpose: LangPurpose.RECIPIENT }))
      .concat(
        formData.accomp_translation !== TranslatedIntoType.NO_TRANSLATION
          ? [
              { isoCode: "de", purpose: LangPurpose.TRANSLATION },
              ...(formData.accomp_translation === TranslatedIntoType.ENGLISH_OK
                ? [{ isoCode: "en", purpose: LangPurpose.TRANSLATION }]
                : []),
            ]
          : [],
      )
      .flat()
      .map(async ({ isoCode, purpose }) => ({
        title: await getLanguageTitle(isoCode),
        purpose,
      })),
  )) as ApiLanguage[];

  for (const opportunityLanguage of opportunityLanguages) {
    const dealEntity = await getDealEntityByTitle(
      opportunityLanguage.title,
      EntityTableName.LANGUAGE,
      Language,
      DealLanguage,
    );

    if (dealEntity) {
      dealEntity.proficiency = opportunityLanguage.proficiency;
      dealLanguage.push(dealEntity);
    }
  }

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
