import {
  ApiOpportunityContact,
  ApiOpportunityGet,
  ApiOpportunityGetList,
  ApiVolunteerOpportunityGetList,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import District from "../../data/entity/location/district.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import logger from "../../logger";
import { formatDate, formatTime, tryCatchFn } from "../utils";
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

  const person =
    opportunity.contactPerson ??
    (submitterStillAtAgent
      ? submitter
      : opportunity.agent?.representative?.person);

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
    location: opportunity.deal.dealDistrict.filter(Boolean).map((ld) => ({
      id: ld.district.id,
    })),
    availability: getAvailabilityTryCatch(opportunity.deal.dealTimeslot) ?? [],
    accompanyingDetails: dtoOpportunityAccompanying(opportunity.accompanying!),
    agentTitle: opportunity.agent?.title ?? "",
    agentId: opportunity.agentId,
    // Names of the volunteers MATCHED to the opportunity (status opp-matched
    // only — not pending/active/past links). PII masking runs before this DTO,
    // so masked names pass through. Needs the
    // opportunityVolunteer.volunteer.person relation loaded.
    volunteerNames: (opportunity.opportunityVolunteer ?? [])
      .filter((ov) => ov.status === OpportunityVolunteerStatusType.MATCHED)
      .map((ov) => ov.volunteer?.person?.name)
      .filter((name): name is string => Boolean(name)),
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
    location: opportunity.deal.dealDistrict.filter(Boolean).map((ld) => ({
      id: ld.district.id,
    })),
    availability: getAvailabilityTryCatch(opportunity.deal.dealTimeslot) ?? [],
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
  let eventStart: Date | undefined = undefined;
  if (opportunityComments.type === OpportunityType.EVENTS) {
    eventStart = (opportunityComments.deal?.dealTimeslot ?? []).find(
      (dt) =>
        dt.timeslot?.start &&
        !dt.timeslot?.end &&
        !dt.timeslot?.rrule &&
        !dt.timeslot?.occasional,
    )?.timeslot?.start;
  }

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
    agentId: opportunityComments.agentId,
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
    location: opportunityComments.deal.dealDistrict
      .filter(Boolean)
      .map((ld) => ({
        id: ld.district.id,
      })),
    availability:
      getAvailabilityTryCatch(opportunityComments.deal.dealTimeslot) ?? [],
    contact: getOpportunityContact(opportunityComments),
    agent: dtoOpportunityAgent(opportunityComments.agent!),
    accompanyingDetails: dtoOpportunityAccompanying(
      opportunityComments.accompanying!,
      opportunityComments.deal.dealLanguage,
      accompanyingDistrict,
    ),
    event: eventStart
      ? {
          date: formatDate(eventStart),
          time: formatTime(eventStart),
        }
      : undefined,
    comments: opportunityComments.comments.map(commentSerializer),
    statusMatch: opportunityComments.statusMatch,
  } as ApiOpportunityGet;
}
