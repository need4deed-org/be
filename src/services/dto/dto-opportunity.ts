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
  // Set only when a district-centroid fallback is actually needed (map-
  // eligible status, agent not geocoded) — lets a caller batch-fetch
  // centroids for just the opportunities that need one, without
  // re-implementing this same status/agent-coordinate gating itself.
  neededDistrictId?: number;
}

// Map-pin coordinates for a card/list-view "map tab" (be#662): only NEW/
// SEARCHING opportunities get placed on the map, sourced from the agent's
// own geocoded address, falling back to the opportunity's district centroid.
// Reads the (already PII-masked, where applicable) entity graph — the
// agent's postcode is nulled by mask.ts for a caller without visibility into
// that agent, same as every other agent/person address field.
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

// Exported so the route handler can decide which district ids to batch-
// fetch centroids for (getDistrictCentroids, data/utils/get-district.ts) —
// a district's postcodes aren't eagerly loaded onto the entity graph, since
// most opportunities never need the fallback at all — without duplicating
// resolveMapPin's status/agent-coordinate gating logic (be#978 review).
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

// Defense-in-depth against be#780: `accompanying` carries refugee PII
// (name/phone/email/address/language) that only ever belongs to an
// ACCOMPANYING-type opportunity. Gating serialization on the *current* type
// here means a leak can't recur from a future write-path bug that leaves a
// stale/non-cleared row behind — the DTO layer no longer trusts the DB row
// to already be clean.
export function accompanyingForType(
  opportunity: Opportunity,
): Accompanying | undefined {
  return opportunity.type === OpportunityType.ACCOMPANYING
    ? opportunity.accompanying
    : undefined;
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

// opportunity.deal_id is nullable, so a deal-less opportunity must still
// serialize (empty lists, null category) instead of 500ing the whole list
// endpoint it appears in (be#999).
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
    // Names of the volunteers MATCHED to the opportunity (status opp-matched
    // only — not pending/active/past links). PII masking runs before this DTO,
    // so masked names pass through. Needs the
    // opportunityVolunteer.volunteer.person relation loaded.
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
