import { ApiOpportunityAccompanyingDetails, OptionById } from "need4deed-sdk";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

export function dtoOpportunityAccompanying(
  accompanying: Accompanying,
  profileLanguage: ProfileLanguage[] = [],
): ApiOpportunityAccompanyingDetails {
  return accompanying
    ? {
        appointmentAddress: accompanying.address,
        appointmentDate: accompanying.date.toISOString(),
        appointmentTime: `${String(accompanying.date.getUTCHours()).padStart(2, "0")}:${String(accompanying.date.getUTCMinutes()).padStart(2, "0")}`,
        refugeeNumber: accompanying.phone,
        refugeeName: accompanying.name,
        appointmentLanguage: accompanying.languageToTranslate,
        refugeeLanguage: profileLanguage
          .filter(Boolean)
          .map((pl): OptionById => ({ id: pl.language.id })),
      }
    : {};
}
