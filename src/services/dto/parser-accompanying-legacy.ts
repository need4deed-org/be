import { OpportunityLegacyFormData, TranslatedIntoType } from "need4deed-sdk";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";

export function accompanyingParserOpportunity(
  body: OpportunityLegacyFormData,
): Accompanying {
  const accompanying = new Accompanying({
    address: body.accomp_address,
    name: body.accomp_name,
    phone: body.accomp_phone,
    date: new Date(body.accomp_datetime),
    languageToTranslate: body.accomp_translation as TranslatedIntoType,
  });

  return accompanying;
}
