import { ApiOpportunityAccompanyingDetails, OptionById } from "need4deed-sdk";
import District from "../../data/entity/location/district.entity";
import DealLanguage from "../../data/entity/m2m/deal-language";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";
import { formatDate, formatTime } from "../utils";

export function dtoOpportunityAccompanying(
  accompanying: Accompanying,
  dealLanguage: DealLanguage[] = [],
  district?: District | null,
): ApiOpportunityAccompanyingDetails {
  return accompanying
    ? {
        appointmentAddress: accompanying.address,
        appointmentDate: formatDate(accompanying.date),
        appointmentTime: formatTime(accompanying.date),
        refugeeNumber: accompanying.phone,
        refugeeName: accompanying.name,
        appointmentLanguage: accompanying.languageToTranslate,
        refugeeLanguage: dealLanguage
          .filter(Boolean)
          .map((pl): OptionById => ({ id: pl.language.id })),
        ...(accompanying.postcode?.value
          ? { appointmentPostcode: accompanying.postcode.value }
          : {}),
        ...(district ? { appointmentDistrict: { id: district.id } } : {}),
      }
    : {};
}
