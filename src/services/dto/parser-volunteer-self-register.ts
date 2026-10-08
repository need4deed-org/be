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
import { AddressReusePlan } from "../../server/utils";
import { buildDealTimeslots, WEEKDAYS } from "./build-deal-timeslots";
import { resolveByIds, toIds } from "./parser-deal-opportunity-create";

export type VolunteerSelfRegisterBody = ApiVolunteerRegisterNew;

const BY_DAY_TO_WEEKDAY: Record<string, number> = Object.fromEntries(
  WEEKDAYS.map((day, index) => [day, index]).filter(([day]) => day !== ""),
);

const OCCASIONAL_DAYTIMES: string[] = Object.values(OccasionalType);

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

function resolveAddress(
  person: Person,
  postcode: Postcode,
): { address?: Address; addressReuse?: AddressReusePlan } {
  if (person.addressId) {
    return {
      addressReuse: { addressId: person.addressId, postcodeId: postcode.id },
    };
  }
  return { address: new Address({ postcode }) };
}

export async function parserVolunteerSelfRegister(
  person: Person,
  body: VolunteerSelfRegisterBody,
): Promise<{
  volunteer: Volunteer;
  leads: LeadFrom[];
  addressReuse?: AddressReusePlan;
}> {
  const postcode = await getPostcode(String(body.addressPostcode));

  const [dealActivity, dealSkill, dealDistrict, dealLanguage, dealTimeslot] =
    await Promise.all([
      resolveByIds(
        optionIds(body.activities),
        Activity,
        DealActivity,
        "activity",
      ),
      resolveByIds(optionIds(body.skills), Skill, DealSkill, "skill"),
      resolveByIds(
        optionIds(body.locations),
        District,
        DealDistrict,
        "district",
      ),
      resolveDealLanguages(body.languages),
      buildDealTimeslots(availabilityToTimeslots(body.availability), null),
    ]);
  const { address, addressReuse } = resolveAddress(person, postcode);
  if (address) {
    person.address = address;
  }

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

  return { volunteer, leads, addressReuse };
}
