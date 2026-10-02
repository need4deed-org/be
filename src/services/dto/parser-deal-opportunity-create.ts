import {
  LangPurpose,
  OpportunityFormDataWithAgentSubmitter,
} from "need4deed-sdk";
import { In } from "typeorm";
import { dataSource } from "../../data/data-source";
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
import { getPostcode, getRepository } from "../../data/utils";
import { buildDealTimeslots } from "./build-deal-timeslots";

export function toIds(ids: number[] | undefined | null): number[] {
  return [...new Set((ids || []).map(Number))].filter(
    (id) => Number.isFinite(id) && id > 0,
  );
}

export async function resolveByIds<
  E extends new () => { id: number },
  M extends object,
>(
  ids: number[] | undefined | null,
  entity: E,
  m2mEntity: new (_args: unknown) => M,
  key: keyof M,
): Promise<M[]> {
  const uniqueIds = toIds(ids);
  if (!uniqueIds.length) {
    return [];
  }

  const repository = getRepository(dataSource, entity);
  const instances = await repository.findBy({ id: In(uniqueIds) });

  return instances.map((instance) => new m2mEntity({ [key]: instance }));
}

export async function dealParserOpportunityCreate(
  formData: OpportunityFormDataWithAgentSubmitter,
  postcodeValue: string,
): Promise<Deal> {
  const postcode = postcodeValue ? await getPostcode(postcodeValue) : null;

  const dealActivity = await resolveByIds(
    formData.activityIds,
    Activity,
    DealActivity,
    "activity",
  );

  const dealSkill = await resolveByIds(
    formData.skillIds,
    Skill,
    DealSkill,
    "skill",
  );

  const languageIds = toIds(formData.languageIds);
  let dealLanguage: DealLanguage[] = [];
  if (languageIds.length) {
    const languageRepository = getRepository(dataSource, Language);
    const languages = await languageRepository.findBy({ id: In(languageIds) });
    dealLanguage = languages.map(
      (language) =>
        new DealLanguage({ language, purpose: LangPurpose.RECIPIENT }),
    );
  }

  const dealDistrict = await resolveByIds(
    formData.districtIds,
    District,
    DealDistrict,
    "district",
  );

  const dealTimeslot = await buildDealTimeslots(
    formData.timeslots,
    formData.onetime_date_time,
  );

  const deal = new Deal({
    type: DealType.VOLUNTEER,
    dealActivity,
    dealSkill,
    dealLanguage,
    dealTimeslot,
    dealDistrict,
    postcode,
  });

  return deal;
}
