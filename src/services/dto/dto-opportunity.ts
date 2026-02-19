import {
  ApiOpportunityGetList,
  ApiVolunteerOpportunityGetList,
} from "need4deed-sdk";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import { tryCatchFn } from "../utils";
import { getAvailability } from "./utils";

export function dtoOpportunityGetList(
  opportunity: Opportunity,
): ApiOpportunityGetList {
  return {
    id: opportunity.id,
    title: opportunity.title,
    category: { id: opportunity.deal.profile.categoryId },
    volunteerType: opportunity.deal.profile.volunteeringType,
    statusOpportunity: opportunity.status,
  };
}

export function dtoVolunteerOpportunityGetList(
  opportunity: Opportunity,
): ApiVolunteerOpportunityGetList {
  const getAvailabilityTryCatch = tryCatchFn(getAvailability, (error) => {
    console.error(
      `Error getting availability for opportunity (id:${opportunity.id}): ${error}`,
    );
  });
  return {
    id: opportunity.id,
    title: opportunity.title,
    category: { id: opportunity.deal.profile.categoryId },
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
    availability: getAvailabilityTryCatch(opportunity.deal.time?.timeTimeslot),
  };
}
