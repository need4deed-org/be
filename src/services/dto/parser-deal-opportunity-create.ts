import {
  LangPurpose,
  OpportunityFormDataWithAgentSubmitter,
} from "need4deed-sdk";
import { In } from "typeorm";
import { dataSource } from "../../data/data-source";
import Deal from "../../data/entity/deal.entity";
import DealActivity from "../../data/entity/m2m/deal-activity";
import DealLanguage from "../../data/entity/m2m/deal-language";
import DealSkill from "../../data/entity/m2m/deal-skill";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Skill from "../../data/entity/profile/skill.entity";
import { DealType } from "../../data/types";
import { getPostcode, getRepository } from "../../data/utils";
import { buildDealTimeslots } from "./deal-timeslots";

// Counterpart to dealParserOpportunity(), for POST /opportunity/ (the
// dashboard's "Create New Opportunity" form) only. That form is a proper
// typed SPA backed by GET /option/activity|skill|language — it sends numeric
// option ids, not the free-text titles/ISO-codes the legacy parser expects.
// Resolving those ids by title (as dealParserOpportunity does) never matches,
// so activities/skills/languages silently end up empty; resolve by id instead.
export async function dealParserOpportunityCreate(
  formData: OpportunityFormDataWithAgentSubmitter,
  postcodeValue?: string,
): Promise<Deal> {
  const postcode = postcodeValue ? await getPostcode(postcodeValue) : null;

  const activityRepository = getRepository(dataSource, Activity);
  const activities = formData.activityIds?.length
    ? await activityRepository.findBy({ id: In(formData.activityIds) })
    : [];
  const dealActivity = activities.map(
    (activity) => new DealActivity({ activity }),
  );

  const skillRepository = getRepository(dataSource, Skill);
  const skills = formData.skillIds?.length
    ? await skillRepository.findBy({ id: In(formData.skillIds) })
    : [];
  const dealSkill = skills.map((skill) => new DealSkill({ skill }));

  const languageRepository = getRepository(dataSource, Language);
  const languages = formData.languageIds?.length
    ? await languageRepository.findBy({ id: In(formData.languageIds) })
    : [];
  const dealLanguage = languages.map(
    (language) =>
      new DealLanguage({ language, purpose: LangPurpose.RECIPIENT }),
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
    postcode,
  });

  return deal;
}
