import {
  LangProficiency,
  LangPurpose,
  OpportunityType,
  ProfileVolunteeringType,
  volunteerTypesFromStatusType,
} from "need4deed-sdk";
import { berlinTimeZone } from "../../../config";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import {
  getOpportunityDescription,
  getOpportunityLocation,
} from "../../../services/dto/dto-opportunity";
import { getAvailability } from "../../../services/dto/utils";

const GERMAN_SUPPORT_CATEGORY = "de-lng-support";
const GERMAN_MENTION = /\b(german(?!y)|deutsch(?!land))/i;
const GERMAN_ISO_CODE = "de";
const FLUENT_GERMAN = new Set<string>([
  LangProficiency.FLUENT,
  LangProficiency.NATIVE,
]);

const WEIGHT = { district: 3, language: 2, activity: 1, availability: 1 };

const berlinWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: berlinTimeZone,
  weekday: "long",
});

export const recommendationVolunteerRelations = [
  "deal.dealActivity",
  "deal.dealLanguage.language",
  "deal.dealTimeslot.timeslot",
  "deal.dealDistrict",
];

export const recommendedVolunteerRelations = [
  "person",
  "person.address.postcode",
  "deal",
  "deal.dealActivity.activity",
  "deal.dealSkill.skill",
  "deal.dealLanguage.language",
  "deal.dealTimeslot.timeslot",
  "deal.dealDistrict.district",
];

export const recommendationOpportunityRelations = [
  "deal.dealActivity.activity.category",
  "deal.dealLanguage.language",
  "deal.dealTimeslot.timeslot",
  "deal.dealDistrict.district",
  "accompanying.postcode.districtPostcode",
  "agent",
  "onetimer",
];

const overlap = <T>(a: Set<T>, b: Set<T>) =>
  [...a].filter((item) => b.has(item)).length;

const availabilityKeys = (opportunityOrVolunteer: Opportunity | Volunteer) =>
  new Set(
    getAvailability(opportunityOrVolunteer.deal?.dealTimeslot ?? []).map(
      ({ day, daytime }) => `${day}|${daytime}`,
    ),
  );

export function isGermanOpportunity(opportunity: Opportunity): boolean {
  return (
    (opportunity.deal?.dealActivity ?? []).some(
      (dealActivity) =>
        dealActivity?.activity?.category?.title === GERMAN_SUPPORT_CATEGORY,
    ) ||
    GERMAN_MENTION.test(opportunity.title ?? "") ||
    GERMAN_MENTION.test(getOpportunityDescription(opportunity) ?? "")
  );
}

export function speaksFluentGerman(volunteer: Volunteer): boolean {
  return (volunteer.deal?.dealLanguage ?? []).some(
    (dealLanguage) =>
      dealLanguage?.language?.isoCode === GERMAN_ISO_CODE &&
      FLUENT_GERMAN.has(dealLanguage.proficiency),
  );
}

export function volunteerStatusTypesFor(
  opportunityType: OpportunityType,
): ProfileVolunteeringType[] {
  return Object.values(ProfileVolunteeringType).filter((statusType) =>
    volunteerTypesFromStatusType(statusType).includes(opportunityType),
  );
}

export function volunteerFitsOpportunity(
  volunteer: Volunteer,
  opportunity: Opportunity,
): boolean {
  const fitsType = volunteerTypesFromStatusType(volunteer.statusType).includes(
    opportunity.type,
  );
  return (
    fitsType &&
    (!isGermanOpportunity(opportunity) || speaksFluentGerman(volunteer))
  );
}

export function matchScore(
  opportunity: Opportunity,
  volunteer: Volunteer,
): number {
  const languagePurposes =
    opportunity.type === OpportunityType.ACCOMPANYING
      ? [LangPurpose.RECIPIENT, LangPurpose.TRANSLATION]
      : [LangPurpose.GENERAL];
  const opportunityLanguages = new Set(
    (opportunity.deal?.dealLanguage ?? [])
      .filter((dealLanguage) => languagePurposes.includes(dealLanguage.purpose))
      .map((dealLanguage) => dealLanguage.languageId),
  );
  const volunteerLanguages = new Set(
    (volunteer.deal?.dealLanguage ?? []).map(
      (dealLanguage) => dealLanguage.languageId,
    ),
  );

  const opportunityDistricts = new Set(
    [
      getOpportunityLocation(opportunity).districtId ??
        opportunity.agent?.districtId,
      ...(opportunity.deal?.dealDistrict ?? []).map(
        (dealDistrict) => dealDistrict.districtId,
      ),
    ].filter(Boolean),
  );
  const volunteerDistricts = new Set(
    (volunteer.deal?.dealDistrict ?? []).map(
      (dealDistrict) => dealDistrict.districtId,
    ),
  );

  const opportunityActivities = new Set(
    (opportunity.deal?.dealActivity ?? []).map(
      (dealActivity) => dealActivity.activityId,
    ),
  );
  const volunteerActivities = new Set(
    (volunteer.deal?.dealActivity ?? []).map(
      (dealActivity) => dealActivity.activityId,
    ),
  );

  const volunteerAvailability = availabilityKeys(volunteer);
  const appointment = opportunity.onetimer?.date;
  const appointmentDay =
    appointment && `${berlinWeekday.format(new Date(appointment))}|`;
  const availabilityOverlap = appointmentDay
    ? [...volunteerAvailability].filter((key) => key.startsWith(appointmentDay))
        .length
    : overlap(availabilityKeys(opportunity), volunteerAvailability);

  return (
    WEIGHT.district *
      Math.min(overlap(opportunityDistricts, volunteerDistricts), 1) +
    WEIGHT.language * overlap(opportunityLanguages, volunteerLanguages) +
    WEIGHT.activity * overlap(opportunityActivities, volunteerActivities) +
    WEIGHT.availability * availabilityOverlap
  );
}

export function topRanked<T extends { id: number }>(
  candidates: T[],
  score: (candidate: T) => number,
  limit: number,
): T[] {
  return candidates
    .map((candidate) => ({ candidate, score: score(candidate) }))
    .sort((a, b) => b.score - a.score || a.candidate.id - b.candidate.id)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
