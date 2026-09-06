import {
  ApiAvailability,
  ApiLanguage,
  ApiVolunteerRegisterNew,
  LangProficiency,
  OccasionalType,
  OptionItem,
} from "need4deed-sdk";
import { In } from "typeorm";
import { BadRequestError } from "../../config";
import { dataSource } from "../../data/data-source";
import Deal from "../../data/entity/deal.entity";
import LeadFrom from "../../data/entity/lead.entity";
import Address from "../../data/entity/location/address.entity";
import District from "../../data/entity/location/district.entity";
import Postcode from "../../data/entity/location/postcode.entity";
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
import { DUMMY_ADDRESS_TITLE } from "../../server/utils";
import { buildDealTimeslots, WEEKDAYS } from "./build-deal-timeslots";
import { resolveByIds, toIds } from "./parser-deal-opportunity-create";

export type VolunteerSelfRegisterBody = ApiVolunteerRegisterNew;

// Derived from build-deal-timeslots.ts's WEEKDAYS (["", "Monday", ...,
// "Sunday"], index 1-7) instead of a second hand-maintained table, so the two
// can't drift apart on a future day-name/ordering change.
const BY_DAY_TO_WEEKDAY: Record<string, number> = Object.fromEntries(
  WEEKDAYS.map((day, index) => [day, index]).filter(([day]) => day !== ""),
);

const OCCASIONAL_DAYTIMES: string[] = Object.values(OccasionalType);

// ApiAvailability's {day, daytime} (day a name string, "occasionally" or
// absent meaning the occasional bucket) into the [day, daytime][] tuple
// format buildDealTimeslots already knows how to resolve — same tuple shape
// dealParserOpportunityCreate's formData.timeslots uses.
//
// `entry.day` and `entry.daytime` are independently optional at the schema
// level (need4deed-sdk's ApiAvailability), so a client can send a
// time-of-day daytime ("08-11") with no day at all. Only an occasional
// daytime ("weekdays"/"weekends") is meaningful without a day — anything
// else missing a day is a malformed entry, not a silent "occasional" default
// (buildDealTimeslots would otherwise store a bogus occasional value).
function availabilityToTimeslots(
  availability: ApiAvailability[] | undefined | null,
): [number, string][] {
  const result: [number, string][] = [];
  for (const entry of availability || []) {
    if (!entry.daytime) {
      continue;
    }
    if (!entry.day) {
      if (!OCCASIONAL_DAYTIMES.includes(entry.daytime)) {
        throw new BadRequestError(
          `Availability entry with daytime "${entry.daytime}" is missing "day" — only an occasional daytime (${OCCASIONAL_DAYTIMES.join(", ")}) may omit it.`,
        );
      }
      result.push([0, entry.daytime]);
      continue;
    }
    const weekday = BY_DAY_TO_WEEKDAY[entry.day] ?? 0;
    result.push([weekday, entry.daytime]);
  }
  return result;
}

function optionIds(
  // OptionById.id is `OptionId` (string | number) SDK-wide, unlike OptionItem
  // (always numeric) — coerce so callers get real numbers regardless.
  options: Array<{ id: number | string }> | undefined | null,
): number[] {
  return (options || []).map((option) => Number(option.id));
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

// Reuses the Person's existing Address (patching its postcode) instead of
// always minting a fresh one — the Person attached here can be pre-existing
// (email-linked, be#947), and may already own a real address from an earlier
// flow (e.g. an opportunity/event submission, get-or-create-submitter-person).
// Mirrors that same file's "Dummy" placeholder guard: the seeded placeholder
// is shared across many Person rows, so it must never be patched in place.
async function resolveAddress(
  person: Person,
  postcode: Postcode,
): Promise<Address> {
  if (person.addressId) {
    const addressRepository = getRepository(dataSource, Address);
    const existing = await addressRepository.findOneBy({
      id: person.addressId,
    });
    if (existing && existing.title !== DUMMY_ADDRESS_TITLE) {
      existing.postcode = postcode;
      return existing;
    }
  }
  return new Address({ postcode });
}

export async function parserVolunteerSelfRegister(
  person: Person,
  body: VolunteerSelfRegisterBody,
): Promise<{ volunteer: Volunteer; leads: LeadFrom[] }> {
  // Required: both Address.postcodeId and Deal.postcodeId are NOT NULL, and
  // a volunteer can't be matched to anything without a location.
  const postcode = await getPostcode(String(body.addressPostcode));

  // None of these depend on each other's result, only on the final
  // Deal/Volunteer construction below — resolve them concurrently instead of
  // paying for each round-trip in series.
  const [
    address,
    dealActivity,
    dealSkill,
    dealDistrict,
    dealLanguage,
    dealTimeslot,
  ] = await Promise.all([
    resolveAddress(person, postcode),
    resolveByIds(
      optionIds(body.activities),
      Activity,
      DealActivity,
      "activity",
    ),
    resolveByIds(optionIds(body.skills), Skill, DealSkill, "skill"),
    resolveByIds(optionIds(body.locations), District, DealDistrict, "district"),
    resolveDealLanguages(body.languages),
    buildDealTimeslots(availabilityToTimeslots(body.availability), null),
  ]);
  person.address = address;

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
