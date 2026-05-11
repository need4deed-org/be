import { ApiOpportunityAccompanyingDetails } from "need4deed-sdk";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

export function dtoOpportunityAccompanying(
  accompanying: Accompanying,
): ApiOpportunityAccompanyingDetails {
  return accompanying
    ? {
        appointmentAddress: accompanying.address,
        appointmentDate: accompanying.date.toDateString(),
        appointmentTime: `${String(accompanying.date.getUTCHours()).padStart(2, "0")}:${String(accompanying.date.getUTCMinutes()).padStart(2, "0")}`,
        refugeeNumber: accompanying.phone,
        refugeeName: accompanying.name,
        languageToTranslate: accompanying.langCode,
      }
    : {};
}
