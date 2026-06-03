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

// Best-effort: returns the original submitter if they still hold an
// agent_person row for the opportunity's agent; otherwise falls back to
// the current agent representative. Not guaranteed to be the submitter.
export function getOpportunityContact(
  opportunity: Opportunity,
): ApiOpportunityContact {
  const submitter = opportunity.submittedByPerson;
  const submitterStillAtAgent =
    !!submitter &&
    !!opportunity.agentId &&
    !!submitter.agentPerson?.some((ap) => ap.agentId === opportunity.agentId);

  const person = submitterStillAtAgent
    ? submitter
    : opportunity.agent?.representative?.person;

  return {
    id: person?.id,
    name: person?.name,
    phone: person?.phone,
    email: person?.email,
    waysToContact: person?.preferredCommunicationType,
  };
}

export function dtoOpportunityGetList(
  opportunity: Opportunity,
): ApiOpportunityGetList {
  return {
    id: opportunity.id,
    title: opportunity.title,
    category: { id: opportunity.deal.categoryId },
    district: { id: opportunity.district?.id ?? opportunity.districtId },
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    statusMatch: opportunity.statusMatch,
    numberOfVolunteers: opportunity.numberVolunteers,
    createdAt: opportunity.createdAt,
    languages: opportunity.deal.dealLanguage.filter(Boolean).map((pl) => ({
      id: pl.language.id,
      title: pl.language.title,
      proficiency: pl.proficiency,
      purpose: pl.purpose,
    })),
    activities: opportunity.deal.dealActivity.filter(Boolean).map((pa) => ({
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
    agentTitle: opportunity.agent?.title ?? "",
  } as ApiOpportunityGetList;
}

export function dtoVolunteerOpportunityGetList(
  opportunity: Opportunity,
): ApiVolunteerOpportunityGetList {
  return {
    id: opportunity.id,
    title: opportunity.title,
    createdAt: opportunity.createdAt,
    category: { id: opportunity.deal.categoryId },
    ...(opportunity.districtId
      ? { district: { id: opportunity.districtId } }
      : {}),
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    languages: opportunity.deal.dealLanguage.filter(Boolean).map((pl) => ({
      id: pl.language.id,
      title: pl.language.title,
      proficiency: pl.proficiency,
    })),
    activities: opportunity.deal.dealActivity.filter(Boolean).map((pa) => ({
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
      opportunity.deal.dealLanguage,
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
    category: { id: opportunityComments.deal.categoryId },
    district: {
      id: opportunityComments.district?.id ?? opportunityComments.districtId,
    },
    description: getOpportunityDescription(opportunityComments) ?? "",
    numberOfVolunteers: opportunityComments.numberVolunteers,
    agentTitle: opportunityComments.agent?.title ?? "",
    languages: opportunityComments.deal.dealLanguage
      .filter(Boolean)
      .map((pl) => ({
        id: pl.language.id,
        title: pl.language.title,
        proficiency: pl.proficiency,
        purpose: pl.purpose,
      })),
    activities: opportunityComments.deal.dealActivity
      .filter(Boolean)
      .map((pa) => ({
        id: pa.activity.id,
      })),
    skills: opportunityComments.deal.dealSkill.filter(Boolean).map((ps) => ({
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
      opportunityComments.deal.dealLanguage,
      accompanyingDistrict,
    ),
    comments: opportunityComments.comments.map(commentSerializer),
    statusMatch: opportunityComments.statusMatch,
  } as ApiOpportunityGet;
}
