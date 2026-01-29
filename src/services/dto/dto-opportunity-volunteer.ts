import { ApiVolunteerOpportunityGet } from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";

export function opportunityVolunteerDTO(
  opportunityVolunteer: OpportunityVolunteer,
): ApiVolunteerOpportunityGet {
  if (!(opportunityVolunteer instanceof OpportunityVolunteer)) {
    throw new Error("Wrong opportunity-volunteer format.");
  }

  return {
    id: opportunityVolunteer.id,
    volunteerId: opportunityVolunteer.volunteerId,
    opportunityId: opportunityVolunteer.opportunityId,
    title: opportunityVolunteer.opportunity.title,
    status: opportunityVolunteer.status,
    updatedAt: opportunityVolunteer.updatedAt,
  };
}
