import {
  ApiOpportunityGetList,
  ApiVolunteerOpportunityGetList,
} from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Profile from "../../data/entity/profile/profile.entity";
import { categorize } from "../../data/lib";
import { getRepository } from "../../data/utils";
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

export function dtoOpportunitiesCalcCategory<T>(
  opportunities: Opportunity[],
  dtoFn: (opportunity: Opportunity) => T,
): T[] {
  const updates: Profile[] = [];
  const opportunitiesUpdated = opportunities.map((opportunity) => {
    if (opportunity.deal.profile.categoryId) {
      return dtoFn(opportunity);
    }

    opportunity.deal.profile.categoryId = categorize(
      opportunity.deal.profile.profileActivity.map(
        ({ activity }) => activity.categoryId,
      ),
    );
    updates.push(opportunity.deal.profile);
    return dtoFn(opportunity);
  });

  if (updates.length > 0) {
    const profileRepository = getRepository(dataSource, Profile);
    profileRepository.save(updates);
  }
  return opportunitiesUpdated;
}
