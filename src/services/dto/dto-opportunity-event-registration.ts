import { ApiOpportunityEventRegistrationGet } from "need4deed-sdk";
import OpportunityEventRegistration from "../../data/entity/opportunity-event-registration.entity";

export function dtoOpportunityEventRegistration(
  registration: OpportunityEventRegistration,
): ApiOpportunityEventRegistrationGet {
  return {
    id: registration.id,
    fullName: registration.fullName,
    email: registration.email,
    phone: registration.phone ?? null,
    numberOfPeople: registration.numberOfPeople,
    languagePreference: registration.languagePreference ?? null,
    message: registration.message ?? null,
    createdAt: registration.createdAt,
  };
}
