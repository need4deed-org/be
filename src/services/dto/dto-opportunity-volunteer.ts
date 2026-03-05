import {
  ApiOpportunityVolunteerGet,
  ApiVolunteerOpportunityGet,
} from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";
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
  return {
    id: opportunityVolunteer.id,
    status: opportunityVolunteer.status,
    volunteerId: opportunityVolunteer.volunteerId,
    opportunityId: opportunityVolunteer.opportunityId,
    updatedAt: opportunityVolunteer.updatedAt,
    name: opportunityVolunteer.volunteer.person.name,
    avatarUrl: opportunityVolunteer.volunteer.person.avatarUrl,
    volunteeringType: opportunityVolunteer.volunteer.statusType,
    engagement: opportunityVolunteer.volunteer.statusEngagement,
    activities: getOptionItems(
      opportunityVolunteer.volunteer.deal.profile?.profileActivity,
      "activity",
    ),
    skills: getOptionItems(
      opportunityVolunteer.volunteer.deal.profile?.profileSkill,
      "skill",
    ),
    languages: getLanguages(
      opportunityVolunteer.volunteer.deal.profile?.profileLanguage,
    ),
    availability: getAvailability(
      opportunityVolunteer.volunteer.deal.time?.timeTimeslot,
    ),
    locations: getOptionItems(
      opportunityVolunteer.volunteer.deal.location?.locationDistrict,
      "district",
    ),
  };
}
