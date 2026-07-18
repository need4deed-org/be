import {
  ApiLanguage,
  EntityTableName,
  LangPurpose,
  OpportunityLegacyFormData,
} from "need4deed-sdk";
import Deal from "../../data/entity/deal.entity";
import District from "../../data/entity/location/district.entity";
import DealActivity from "../../data/entity/m2m/deal-activity";
import DealDistrict from "../../data/entity/m2m/deal-district";
import DealLanguage from "../../data/entity/m2m/deal-language";
import DealSkill from "../../data/entity/m2m/deal-skill";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Skill from "../../data/entity/profile/skill.entity";
import { DealType } from "../../data/types";
import { getPostcode } from "../../data/utils";
import { getLanguageTitle, getProfileEntityByTitle } from "../../server/utils";
import { buildDealTimeslots } from "./deal-timeslots";

export async function dealParserOpportunity(
  formData: OpportunityLegacyFormData,
  postcodeValue?: string,
): Promise<Deal> {
  // postcode: explicit value (e.g. the owning agent's, for POST /opportunity)
  // wins, else the form's rac_plz. Skip when neither is present so we don't mint
  // a bogus "undefined" postcode.
  const code = postcodeValue ?? formData.rac_plz;
  const postcode = code ? await getPostcode(String(code)) : null;

  // activities
  const dealActivity: DealActivity[] = [];
  const opportunityActivities = (formData.activities || []) as string[];
  for (const opportunityActivity of opportunityActivities) {
    const profileEntity = await getProfileEntityByTitle(
      opportunityActivity,
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
  const opportunitySkills = (formData.skills || []) as string[];
  for (const opportunitySkill of opportunitySkills) {
    const profileEntity = await getProfileEntityByTitle(
      opportunitySkill,
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
      DealLanguage,
    );

    if (profileEntity) {
      profileEntity.proficiency = opportunityLanguage.proficiency;
      dealLanguage.push(profileEntity);
    }
  }

  // time
  const dealTimeslot = await buildDealTimeslots(
    formData.timeslots,
    formData.onetime_date_time,
  );

  // districts
  const dealDistrict: DealDistrict[] = [];
  const volunteerDistricts = (formData.berlin_locations || []) as string[];
  for (const volunteerDistrict of volunteerDistricts) {
    const profileEntity = await getProfileEntityByTitle(
      volunteerDistrict,
      EntityTableName.NONE,
      District,
      DealDistrict,
      "district",
    );
    if (profileEntity) {
      dealDistrict.push(profileEntity);
    }
  }

  // deal
  const type = DealType.VOLUNTEER;
  const deal = new Deal({
    type,
    dealActivity,
    dealSkill,
    dealLanguage,
    dealTimeslot,
    dealDistrict,
    postcode,
  });

  return deal;
}
