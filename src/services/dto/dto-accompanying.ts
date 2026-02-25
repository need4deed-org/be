import { ApiOpportunityAccompanyingDetails } from "need4deed-sdk";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

export function dtoOpportunityAccompanying(
  accompanying: Accompanying,
): ApiOpportunityAccompanyingDetails {
  return {
    appointmentAddress: accompanying.address,
    appointmentDate: accompanying.date,
    appointmentTime: accompanying.date,
    refugeeNumber: accompanying.phone,
    refugeeName: accompanying.name,
    languageToTranslate: accompanying.languageToTranslate,
  };
}
