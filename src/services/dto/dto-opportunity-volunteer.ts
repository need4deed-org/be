import {
  ApiOpportunityVolunteerGet,
  ApiVolunteerOpportunityGet,
} from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";

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
    volunteeringType: opportunityVolunteer.volunteer.statusType,
    engagement: opportunityVolunteer.volunteer.statusEngagement,
  };
}
