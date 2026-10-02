import {
  ApiOpportunityContact,
  ApiOpportunityGet,
  ApiOpportunityGetList,
  ApiVolunteerOpportunityGetList,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
} from "need4deed-sdk";
import Comment from "../../data/entity/comment.entity";
import Deal from "../../data/entity/deal.entity";
import District from "../../data/entity/location/district.entity";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import { Centroid } from "../../data/utils/get-district";
import logger from "../../logger";
import {
  formatAppointmentDateTime,
  formatDate,
  formatTime,
  tryCatchFn,
} from "../utils";
import { dtoOpportunityAccompanying } from "./dto-accompanying";
import { dtoOpportunityAgent } from "./dto-agent";
import { commentSerializer } from "./dto-comment";
import { getAvailability, getCoordinates } from "./utils";

interface MapPinResolution {
  lat: number | null;
  lon: number | null;
  neededDistrictId?: number;
}

function resolveMapPin(opportunity: Opportunity): MapPinResolution {
  if (
    opportunity.status !== OpportunityStatusType.NEW &&
    opportunity.status !== OpportunityStatusType.SEARCHING
  ) {
    return { lat: null, lon: null };
  }

  const agentCoordinates = getCoordinates(opportunity.agent?.address?.postcode);
  if (
    agentCoordinates.latitude !== null &&
    agentCoordinates.longitude !== null
  ) {
    return { lat: agentCoordinates.latitude, lon: agentCoordinates.longitude };
  }

  return {
    lat: null,
    lon: null,
    neededDistrictId:
      opportunity.district?.id ?? opportunity.districtId ?? undefined,
  };
}

export function getOpportunityDistrictIdNeedingCentroid(
  opportunity: Opportunity,
): number | undefined {
  return resolveMapPin(opportunity).neededDistrictId;
}

function getOpportunityCoordinates(
  opportunity: Opportunity,
  districtCentroid?: Centroid,
): {
  lat: number | null;
  lon: number | null;
} {
  const resolved = resolveMapPin(opportunity);
  if (resolved.neededDistrictId === undefined) {
    return { lat: resolved.lat, lon: resolved.lon };
  }
  return {
    lat: districtCentroid?.latitude ?? null,
    lon: districtCentroid?.longitude ?? null,
  };
}

const getAvailabilityTryCatch = tryCatchFn(getAvailability, (error) => {
  logger.error(`Error getting availability for opportunity: ${error}`);
});

function getOpportunityDescription(opportunity: Opportunity) {
  if (opportunity.type === OpportunityType.ACCOMPANYING) {
    return opportunity.infoConfidential;
  }
  return opportunity.info;
}

export function accompanyingForType(
  opportunity: Opportunity,
): Accompanying | undefined {
  return opportunity.type === OpportunityType.ACCOMPANYING
    ? opportunity.accompanying
    : undefined;
}

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

const EMPTY_DEAL = {
  categoryId: null,
  dealLanguage: [],
  dealActivity: [],
  dealSkill: [],
  dealDistrict: [],
  dealTimeslot: [],
} as unknown as Deal;

function dealOrEmpty(opportunity: Opportunity): Deal {
  return opportunity.deal ?? EMPTY_DEAL;
}

export function dtoOpportunityGetList(
  opportunity: Opportunity,
  districtCentroid?: Centroid,
): ApiOpportunityGetList {
  const deal = dealOrEmpty(opportunity);
  const { appointmentDate, appointmentTime } = formatAppointmentDateTime(
    opportunity.onetimer?.date,
  );

  return {
    id: opportunity.id,
    title: opportunity.title,
    category: { id: deal.categoryId },
    district: { id: opportunity.district?.id ?? opportunity.districtId },
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    statusMatch: opportunity.statusMatch,
    numberOfVolunteers: opportunity.numberVolunteers,
    createdAt: opportunity.createdAt,
    languages: deal.dealLanguage.filter(Boolean).map((pl) => ({
      id: pl.language.id,
      title: pl.language.title,
      proficiency: pl.proficiency,
      purpose: pl.purpose,
    })),
    activities: deal.dealActivity.filter(Boolean).map((pa) => ({
      id: pa.activity.id,
    })),
    location: deal.dealDistrict.filter(Boolean).map((ld) => ({
      id: ld.district.id,
    })),
    availability: getAvailabilityTryCatch(deal.dealTimeslot) ?? [],
    accompanyingDetails: dtoOpportunityAccompanying(
      accompanyingForType(opportunity)!,
      opportunity.onetimer?.date,
    ),
    agentTitle: opportunity.agent?.title ?? "",
    agentId: opportunity.agentId,
    appointmentDate,
    appointmentTime,
    volunteerNames: (opportunity.opportunityVolunteer ?? [])
      .filter((ov) => ov.status === OpportunityVolunteerStatusType.MATCHED)
      .map((ov) => ov.volunteer?.person?.name)
      .filter((name): name is string => Boolean(name)),
    ...getOpportunityCoordinates(opportunity, districtCentroid),
  } as ApiOpportunityGetList;
}

export function dtoVolunteerOpportunityGetList(
  opportunity: Opportunity,
): ApiVolunteerOpportunityGetList {
  const deal = dealOrEmpty(opportunity);
  return {
    id: opportunity.id,
    title: opportunity.title,
    createdAt: opportunity.createdAt,
    category: { id: deal.categoryId },
    ...(opportunity.districtId
      ? { district: { id: opportunity.districtId } }
      : {}),
    volunteerType: opportunity.type,
    statusOpportunity: opportunity.status,
    languages: deal.dealLanguage.filter(Boolean).map((pl) => ({
      id: pl.language.id,
      title: pl.language.title,
      proficiency: pl.proficiency,
    })),
    activities: deal.dealActivity.filter(Boolean).map((pa) => ({
      id: pa.activity.id,
    })),
    location: deal.dealDistrict.filter(Boolean).map((ld) => ({
      id: ld.district.id,
    })),
    availability: getAvailabilityTryCatch(deal.dealTimeslot) ?? [],
    accompanyingDetails: dtoOpportunityAccompanying(
      accompanyingForType(opportunity)!,
      opportunity.onetimer?.date,
      deal.dealLanguage,
    ),
    statusMatch: opportunity.statusMatch,
  } as ApiVolunteerOpportunityGetList;
}

export function dtoOpportunityGet(
  opportunityComments: Opportunity & { comments: Comment[] },
  accompanyingDistrict?: District | null,
  districtCentroid?: Centroid,
): ApiOpportunityGet {
  const deal = dealOrEmpty(opportunityComments);
  const eventStart =
    opportunityComments.type === OpportunityType.EVENTS
      ? opportunityComments.onetimer?.date
      : undefined;

  const { appointmentDate, appointmentTime } = formatAppointmentDateTime(
    opportunityComments.onetimer?.date,
  );

  return {
    id: opportunityComments.id,
    title: opportunityComments.title,
    volunteerType: opportunityComments.type,
    statusOpportunity: opportunityComments.status,
    createdAt: opportunityComments.createdAt,
    category: { id: deal.categoryId },
    district: {
      id: opportunityComments.district?.id ?? opportunityComments.districtId,
    },
    description: getOpportunityDescription(opportunityComments) ?? "",
    numberOfVolunteers: opportunityComments.numberVolunteers,
    agentTitle: opportunityComments.agent?.title ?? "",
    agentId: opportunityComments.agentId,
    appointmentDate,
    appointmentTime,
    languages: deal.dealLanguage.filter(Boolean).map((pl) => ({
      id: pl.language.id,
      title: pl.language.title,
      proficiency: pl.proficiency,
      purpose: pl.purpose,
    })),
    activities: deal.dealActivity.filter(Boolean).map((pa) => ({
      id: pa.activity.id,
    })),
    skills: deal.dealSkill.filter(Boolean).map((ps) => ({
      id: ps.skill.id,
    })),
    location: deal.dealDistrict.filter(Boolean).map((ld) => ({
      id: ld.district.id,
    })),
    availability: getAvailabilityTryCatch(deal.dealTimeslot) ?? [],
    contact: getOpportunityContact(opportunityComments),
    agent: dtoOpportunityAgent(opportunityComments.agent!),
    accompanyingDetails: dtoOpportunityAccompanying(
      accompanyingForType(opportunityComments)!,
      opportunityComments.onetimer?.date,
      deal.dealLanguage,
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
    ...getOpportunityCoordinates(opportunityComments, districtCentroid),
  } as ApiOpportunityGet;
}
