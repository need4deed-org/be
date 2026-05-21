import {
  ApiOpportunityContact,
  ApiOpportunityGet,
  ApiOpportunityGetList,
  ApiVolunteerOpportunityGetList,
  OpportunityType,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import District from "../../data/entity/location/district.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import logger from "../../logger";
import { tryCatchFn } from "../utils";
import { dtoOpportunityAccompanying } from "./dto-accompanying";
import { dtoOpportunityAgent } from "./dto-agent";
import { commentSerializer } from "./dto-comment";
import { getAvailability } from "./utils";

const getAvailabilityTryCatch = tryCatchFn(getAvailability, (error) => {
  logger.error(`Error getting availability for opportunity: ${error}`);
});

function getOpportunityDescription(opportunity: Opportunity) {
  if (opportunity.type === OpportunityType.ACCOMPANYING) {
    return opportunity.infoConfidential;
  }
  return opportunity.info;
}

function getOpportunityContact(
  opportunity: Opportunity,
): ApiOpportunityContact {
  return {
    id: opportunity.agent?.representative?.person?.id,
    name: opportunity.agent?.representative?.person?.name,
    phone: opportunity.agent?.representative?.person?.phone,
    email: opportunity.agent?.representative?.person?.email,
    waysToContact:
      opportunity.agent?.representative?.person?.preferredCommunicationType,
  };
}

export function dtoOpportunityGetList(
  opportunity: Opportunity,
): ApiOpportunityGetList {
  return {
    id: opportunity.id,
    title: opportunity.title,
    category: { id: opportunity.deal.profile.categoryId },
    ...(opportunity.districtId
      ? { district: { id: opportunity.districtId } }
      : {}),
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    createdAt: opportunity.createdAt,
    languages: opportunity.deal.profile.profileLanguage
      .filter(Boolean)
      .map((pl) => ({
        id: pl.language.id,
        title: pl.language.title,
        proficiency: pl.proficiency,
        purpose: pl.purpose,
      })),
    activities: opportunity.deal.profile.profileActivity
      .filter(Boolean)
      .map((pa) => ({
        id: pa.activity.id,
      })),
    location: opportunity.deal.location.locationDistrict
      .filter(Boolean)
      .map((ld) => ({
        id: ld.district.id,
      })),
    availability:
      getAvailabilityTryCatch(opportunity.deal.time?.timeTimeslot) ?? [],
    accompanyingDetails: dtoOpportunityAccompanying(opportunity.accompanying!),
    statusMatch: opportunity.statusMatch,
  } as ApiOpportunityGetList;
}

export function dtoVolunteerOpportunityGetList(
  opportunity: Opportunity,
): ApiVolunteerOpportunityGetList {
  return {
    id: opportunity.id,
    title: opportunity.title,
    createdAt: opportunity.createdAt,
    category: { id: opportunity.deal.profile.categoryId },
    ...(opportunity.districtId
      ? { district: { id: opportunity.districtId } }
      : {}),
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    languages: opportunity.deal.profile.profileLanguage
      .filter(Boolean)
      .map((pl) => ({
        id: pl.language.id,
        title: pl.language.title,
        proficiency: pl.proficiency,
      })),
    activities: opportunity.deal.profile.profileActivity
      .filter(Boolean)
      .map((pa) => ({
        id: pa.activity.id,
      })),
    location: opportunity.deal.location.locationDistrict
      .filter(Boolean)
      .map((ld) => ({
        id: ld.district.id,
      })),
    availability:
      getAvailabilityTryCatch(opportunity.deal.time?.timeTimeslot) ?? [],
    accompanyingDetails: dtoOpportunityAccompanying(
      opportunity.accompanying!,
      opportunity.deal.profile.profileLanguage,
    ),
    statusMatch: opportunity.statusMatch,
  } as ApiVolunteerOpportunityGetList;
}

export function dtoOpportunityGet(
  opportunityComments: Opportunity & { comments: Comment[] },
  accompanyingDistrict?: District | null,
): ApiOpportunityGet {
  return {
    id: opportunityComments.id,
    title: opportunityComments.title,
    volunteerType: opportunityComments.type,
    statusOpportunity: opportunityComments.status,
    createdAt: opportunityComments.createdAt,
    category: { id: opportunityComments.deal.profile.categoryId },
    ...(opportunityComments.districtId
      ? { district: { id: opportunityComments.districtId } }
      : {}),
    description: getOpportunityDescription(opportunityComments) ?? "",
    numberOfVolunteers: opportunityComments.numberVolunteers,
    languages: opportunityComments.deal.profile.profileLanguage
      .filter(Boolean)
      .map((pl) => ({
        id: pl.language.id,
        title: pl.language.title,
        proficiency: pl.proficiency,
        purpose: pl.purpose,
      })),
    activities: opportunityComments.deal.profile.profileActivity
      .filter(Boolean)
      .map((pa) => ({
        id: pa.activity.id,
      })),
    skills: opportunityComments.deal.profile.profileSkill
      .filter(Boolean)
      .map((ps) => ({
        id: ps.skill.id,
      })),
    location: opportunityComments.deal.location.locationDistrict
      .filter(Boolean)
      .map((ld) => ({
        id: ld.district.id,
      })),
    availability:
      getAvailabilityTryCatch(opportunityComments.deal.time?.timeTimeslot) ??
      [],
    contact: getOpportunityContact(opportunityComments),
    agent: dtoOpportunityAgent(opportunityComments.agent!),
    accompanyingDetails: dtoOpportunityAccompanying(
      opportunityComments.accompanying!,
      opportunityComments.deal.profile.profileLanguage,
      accompanyingDistrict,
    ),
    comments: opportunityComments.comments.map(commentSerializer),
    statusMatch: opportunityComments.statusMatch,
  } as ApiOpportunityGet;
}
