import { DocumentStatusType, LangProficiency } from "need4deed-sdk";
import { In } from "typeorm";
import { dataSource } from "../../data/data-source";
import Deal from "../../data/entity/deal.entity";
import LeadFrom from "../../data/entity/lead.entity";
import Address from "../../data/entity/location/address.entity";
import District from "../../data/entity/location/district.entity";
import DealActivity from "../../data/entity/m2m/deal-activity";
import DealDistrict from "../../data/entity/m2m/deal-district";
import DealLanguage from "../../data/entity/m2m/deal-language";
import DealSkill from "../../data/entity/m2m/deal-skill";
import Person from "../../data/entity/person.entity";
import Activity from "../../data/entity/profile/activity.entity";
import Language from "../../data/entity/profile/language.entity";
import Skill from "../../data/entity/profile/skill.entity";
import Volunteer from "../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../data/types";
import { getPostcode, getRepository } from "../../data/utils";
import { buildDealTimeslots } from "./build-deal-timeslots";
import { resolveByIds, toIds } from "./parser-deal-opportunity-create";

// Wire shape mirrors sdk#222's proposed ApiVolunteerRegisterNew
// (https://github.com/need4deed-org/sdk/pull/222) field-for-field. sdk#222
// isn't merged/published yet, so these are local TS interfaces, not an SDK
// import — swap for the real types once that PR lands (be#943 PR
// description / thread). OptionById/OptionItem/ApiLanguage/ApiAvailability
// shapes copied here match sdk#222 exactly so the swap is a no-op rename.
interface OptionById {
  id: number;
  title?: string;
}

interface OptionItem {
  id: number;
  title: string;
  isoCode?: string;
}

interface ApiLanguage {
  id: number;
  title: string;
  proficiency?: LangProficiency;
}

interface ApiAvailability {
  id?: number;
  // ByDay value (e.g. "Monday") or Occasionally ("occasionally") — a day
  // name string, not the weekday-number tuple buildDealTimeslots expects;
  // converted below.
  day?: string;
  // TimeSlot (e.g. "08-11") or OccasionalType (e.g. "weekends") value.
  daytime?: string;
}

export interface VolunteerSelfRegisterBody {
  addressPostcode: string;
  locations: OptionById[];
  languages: ApiLanguage[];
  availability: ApiAvailability[];
  activities: OptionItem[];
  skills: OptionItem[];
  leadFrom: OptionItem[];
  goodConductCertificate: DocumentStatusType;
  measlesVaccination: DocumentStatusType;
  comments: string;
}

const BY_DAY_TO_WEEKDAY: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

// ApiAvailability's {day, daytime} (day a name string, "occasionally" or
// absent meaning the occasional bucket) into the [day, daytime][] tuple
// format buildDealTimeslots already knows how to resolve — same tuple shape
// dealParserOpportunityCreate's formData.timeslots uses.
function availabilityToTimeslots(
  availability: ApiAvailability[] | undefined | null,
): [number, string][] {
  const result: [number, string][] = [];
  for (const entry of availability || []) {
    if (!entry.daytime) {
      continue;
    }
    const weekday = entry.day ? (BY_DAY_TO_WEEKDAY[entry.day] ?? 0) : 0;
    result.push([weekday, entry.daytime]);
  }
  return result;
}

function optionIds(
  options: Array<{ id: number }> | undefined | null,
): number[] {
  return (options || []).map((option) => option.id);
}

async function resolveDealLanguages(
  languages: ApiLanguage[] | undefined | null,
): Promise<DealLanguage[]> {
  const proficiencyById = new Map<number, LangProficiency | undefined>();
  for (const entry of languages || []) {
    if (Number.isFinite(entry.id) && entry.id > 0) {
      proficiencyById.set(entry.id, entry.proficiency);
    }
  }
  const languageIds = [...proficiencyById.keys()];
  if (!languageIds.length) {
    return [];
  }

  const languageRepository = getRepository(dataSource, Language);
  const resolved = await languageRepository.findBy({ id: In(languageIds) });

  // purpose left unset (entity default GENERAL) — RECIPIENT is specific to
  // an opportunity's language need, not a volunteer's own languages.
  return resolved.map((language) => {
    const proficiency = proficiencyById.get(language.id);
    return new DealLanguage({
      language,
      ...(proficiency ? { proficiency } : {}),
    });
  });
}

async function resolveLeadFrom(
  options: OptionItem[] | undefined | null,
): Promise<LeadFrom[]> {
  const uniqueIds = toIds(optionIds(options));
  if (!uniqueIds.length) {
    return [];
  }
  const leadFromRepository = getRepository(dataSource, LeadFrom);
  return leadFromRepository.findBy({ id: In(uniqueIds) });
}

export async function parserVolunteerSelfRegister(
  person: Person,
  body: VolunteerSelfRegisterBody,
): Promise<{ volunteer: Volunteer; leads: LeadFrom[] }> {
  // Required: both Address.postcodeId and Deal.postcodeId are NOT NULL, and
  // a volunteer can't be matched to anything without a location.
  const postcode = await getPostcode(String(body.addressPostcode));
  person.address = new Address({ postcode });

  const dealActivity = await resolveByIds(
    optionIds(body.activities),
    Activity,
    DealActivity,
    "activity",
  );
  const dealSkill = await resolveByIds(
    optionIds(body.skills),
    Skill,
    DealSkill,
    "skill",
  );
  const dealDistrict = await resolveByIds(
    optionIds(body.locations),
    District,
    DealDistrict,
    "district",
  );
  const dealLanguage = await resolveDealLanguages(body.languages);
  const dealTimeslot = await buildDealTimeslots(
    availabilityToTimeslots(body.availability),
    null,
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

  const volunteer = new Volunteer({
    person,
    deal,
    infoAbout: body.comments || "",
    statusVaccination: body.measlesVaccination,
    statusCGC: body.goodConductCertificate,
  });

  const leads = await resolveLeadFrom(body.leadFrom);

  return { volunteer, leads };
}
