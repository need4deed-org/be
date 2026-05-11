import { ApiOpportunityAccompanyingDetails } from "need4deed-sdk";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

export function dtoOpportunityAccompanying(
  accompanying: Accompanying,
): ApiOpportunityAccompanyingDetails {
  return accompanying
    ? {
        appointmentAddress: accompanying.address,
        appointmentDate: accompanying.date.toISOString().split("T")[0],
        appointmentTime: accompanying.date.toTimeString().slice(0, 5),
        refugeeNumber: accompanying.phone,
        refugeeName: accompanying.name,
        languageToTranslate: accompanying.langCode,
      }
    : {};
}
