import { ApiVolunteerOpportunityGet } from "need4deed-sdk";
import OpportunityVolunteer from "../../data/entity/m2m/opportunity-volunteer";

export function opportunityVolunteerDTO(
  opportunityVolunteer: OpportunityVolunteer[],
): ApiVolunteerOpportunityGet[] {
  if (!Array.isArray(opportunityVolunteer)) {
    throw new Error("Wrong opportunity-volunteer format.");
  }

  return opportunityVolunteer.map((ov) => ({
    id: ov.id,
    volunteerId: ov.volunteerId,
    opportunityId: ov.opportunityId,
    title: ov.opportunity.title,
    status: ov.status,
    updatedAt: ov.updatedAt,
  }));
}
