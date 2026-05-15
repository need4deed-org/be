import { ApiOpportunityAccompanyingDetails, OptionById } from "need4deed-sdk";
import District from "../../data/entity/location/district.entity";
import ProfileLanguage from "../../data/entity/m2m/profile-language";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

export function dtoOpportunityAccompanying(
  accompanying: Accompanying,
  profileLanguage: ProfileLanguage[] = [],
  district?: District | null,
): ApiOpportunityAccompanyingDetails {
  return accompanying
    ? {
        appointmentAddress: accompanying.address,
        appointmentDate: accompanying.date.toISOString().split("T")[0],
        appointmentTime: `${String(accompanying.date.getUTCHours()).padStart(2, "0")}:${String(accompanying.date.getUTCMinutes()).padStart(2, "0")}`,
        refugeeNumber: accompanying.phone,
        refugeeName: accompanying.name,
        appointmentLanguage: accompanying.languageToTranslate,
        refugeeLanguage: profileLanguage
          .filter(Boolean)
          .map((pl): OptionById => ({ id: pl.language.id })),
        ...(accompanying.postcode?.value
          ? { appointmentPostcode: accompanying.postcode.value }
          : {}),
        ...(district ? { appointmentDistrict: { id: district.id } } : {}),
      }
    : {};
}
