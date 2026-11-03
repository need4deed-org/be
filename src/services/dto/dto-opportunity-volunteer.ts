import {
  ApiOpportunityVolunteerGet,
  ApiVolunteerOpportunityGet,
  volunteerTypesFromStatusType,
} from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
import logger from "../../logger";
import { getAvailability, getLanguages, getOptionItems } from "./utils";

export function volunteerOpportunityVolunteerDTO(
  opportunityVolunteer: OpportunityVolunteer,
): ApiOpportunityVolunteerGet {
  if (!(opportunityVolunteer instanceof OpportunityVolunteer)) {
    throw new Error("Wrong opportunity-volunteer format.");
  }

  return {
    id: opportunityVolunteer.id,
    status: opportunityVolunteer.status,
    volunteerId: opportunityVolunteer.volunteerId,
    opportunityId: opportunityVolunteer.opportunityId,
    updatedAt: opportunityVolunteer.updatedAt,
    title: opportunityVolunteer.opportunity.title,
  };
}

export function opportunityOpportunityVolunteerDTO(
  opportunityVolunteer: OpportunityVolunteer,
): ApiVolunteerOpportunityGet {
  if (!(opportunityVolunteer instanceof OpportunityVolunteer)) {
    throw new Error("Wrong opportunity-volunteer format.");
  }
  const { volunteer } = opportunityVolunteer;
  const person = volunteer?.person;
  const deal = volunteer?.deal;
  if (!person || !deal) {
    logger.warn(
      `Opportunity-volunteer ${opportunityVolunteer.id}: volunteer ${opportunityVolunteer.volunteerId} is missing ${!person ? "person" : "deal"}.`,
    );
  }
  return {
    id: opportunityVolunteer.id,
    status: opportunityVolunteer.status,
    volunteerId: opportunityVolunteer.volunteerId,
    opportunityId: opportunityVolunteer.opportunityId,
    updatedAt: opportunityVolunteer.updatedAt,
    name: person?.name ?? "",
    avatarUrl: person?.avatarUrl ?? null,
    volunteeringType: volunteer?.statusType ?? null,
    volunteeringTypes: volunteerTypesFromStatusType(volunteer?.statusType),
    engagement: volunteer?.statusEngagement ?? null,
    communication: volunteer?.statusCommunication ?? null,
    activities: getOptionItems(deal?.dealActivity ?? [], "activity"),
    skills: getOptionItems(deal?.dealSkill ?? [], "skill"),
    languages: getLanguages(deal?.dealLanguage ?? []),
    availability: getAvailability(deal?.dealTimeslot ?? []),
    locations: getOptionItems(deal?.dealDistrict ?? [], "district"),
  };
}
