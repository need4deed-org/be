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

// Wire shape POSTed by fe's VolunteerRegistration/ProfileCompletion (fe#972),
// same numeric-id-based option pattern as dealParserOpportunityCreate — not
// yet an SDK type since fe#972 itself hasn't merged/stabilized (see be#943
// PR description). languages[].language carries the Language option id as a
// string (fe's <select> value), not a title — same id-based pattern as the
// other fields, just string-encoded by the form control.
export interface VolunteerSelfRegisterBody {
  addressPostcode: string;
  locations: number[];
  languages: Array<{ id: number; language: string; level: string }>;
  availability: Array<{
    weekday: number;
    timeSlots: Array<{ id: string; selected: boolean }>;
  }>;
  activities: number[];
  skills: number[];
  leadFrom: number[];
  goodConductCertificate: DocumentStatusType;
  measlesVaccination: DocumentStatusType;
  comments: string;
}

// fe's Availability shape (weekday 0-7, 0 = occasional) into the [day,
// daytime][] tuple format buildDealTimeslots already knows how to resolve —
// same tuple shape dealParserOpportunityCreate's formData.timeslots uses.
function availabilityToTimeslots(
  availability: VolunteerSelfRegisterBody["availability"] | undefined | null,
): [number, string][] {
  const result: [number, string][] = [];
  for (const { weekday, timeSlots } of availability || []) {
    for (const slot of timeSlots || []) {
      if (slot.selected) {
        result.push([weekday, String(slot.id)]);
      }
    }
  }
  return result;
}

async function resolveDealLanguages(
  languages: VolunteerSelfRegisterBody["languages"] | undefined | null,
): Promise<DealLanguage[]> {
  const levelByLanguageId = new Map<number, string>();
  for (const entry of languages || []) {
    const languageId = Number(entry.language);
    if (Number.isFinite(languageId) && languageId > 0 && entry.level) {
      levelByLanguageId.set(languageId, entry.level);
    }
  }
  const languageIds = [...levelByLanguageId.keys()];
  if (!languageIds.length) {
    return [];
  }

  const languageRepository = getRepository(dataSource, Language);
  const resolved = await languageRepository.findBy({ id: In(languageIds) });

  // purpose left unset (entity default GENERAL) — RECIPIENT is specific to
  // an opportunity's language need, not a volunteer's own languages.
  return resolved.map(
    (language) =>
      new DealLanguage({
        language,
        proficiency: levelByLanguageId.get(language.id) as LangProficiency,
      }),
  );
}

async function resolveLeadFrom(
  ids: number[] | undefined | null,
): Promise<LeadFrom[]> {
  const uniqueIds = toIds(ids);
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
    body.activities,
    Activity,
    DealActivity,
    "activity",
  );
  const dealSkill = await resolveByIds(body.skills, Skill, DealSkill, "skill");
  const dealDistrict = await resolveByIds(
    body.locations,
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
