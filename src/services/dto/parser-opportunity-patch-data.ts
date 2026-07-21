import { ApiOpportunityPatch, LangPurpose } from "need4deed-sdk";
import { In, Repository } from "typeorm";
import { getNameFields } from "..";
import { BadRequestError } from "../../config";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";
import Agent from "../../data/entity/opportunity/agent.entity";
import Language from "../../data/entity/profile/language.entity";
import { DataId } from "../../server/types";
import { getEmptyPropsNull } from "../../server/utils/common";
import { getDateObj } from "../utils";

type LanguagePatchItem = { id: number | string; purpose: LangPurpose };

// The org's main communication language is German; volunteers may additionally
// read English, so the only valid "main communication" sets are: none, German
// alone, or German+English together — never English alone or any other language.
export async function assertValidMainCommunicationLanguages(
  languagesMain: { id: number | string }[] | undefined,
  languageRepository: Repository<Language>,
): Promise<void> {
  if (!languagesMain?.length) {
    return;
  }
  const ids = [...new Set(languagesMain.map(({ id }) => Number(id)))];
  const languages = await languageRepository.findBy({ id: In(ids) });
  // Any id that didn't resolve to a real row (stale/bogus reference) must be
  // rejected outright, not silently dropped — otherwise a request like
  // [germanId, 999999] would validate as "German only" despite containing
  // an unresolvable language.
  if (languages.length !== ids.length) {
    throw new BadRequestError(
      "Main communication language must be German, German and English, or none.",
    );
  }
  const isoCodes = new Set(languages.map((l) => l.isoCode));

  const isGermanOnly = isoCodes.size === 1 && isoCodes.has("de");
  const isGermanAndEnglish =
    isoCodes.size === 2 && isoCodes.has("de") && isoCodes.has("en");

  if (!isGermanOnly && !isGermanAndEnglish) {
    throw new BadRequestError(
      "Main communication language must be German, German and English, or none.",
    );
  }
}

function dedupeLanguages(items: LanguagePatchItem[]): LanguagePatchItem[] {
  const seen = new Set<string>();
  return items.filter(({ id, purpose }) => {
    const key = `${id}:${purpose}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function parseOpportunity(body: ApiOpportunityPatch) {
  if (!body) {
    throw new BadRequestError("invalid body for parseOpportunity.");
  }
  const accompanyingDetails = body.accompanyingDetails;
  const agentBody = body?.agent;
  return {
    ...getEmptyPropsNull({
      opportunity: {
        title: body.title,
        status: body.statusOpportunity,
        numberVolunteers: body.numberVolunteers,
        info: body.description,
        infoConfidential: body.description,
      },
      contact: body?.contact
        ? {
            id: body?.contact?.id,
            ...getNameFields(body.contact.name),
            phone: body?.contact?.phone,
            email: body?.contact?.email,
            preferredCommunicationType: body?.contact?.waysToContact,
          }
        : {},
      agent:
        agentBody && agentBody.id === undefined
          ? ({
              title: agentBody.name,
            } as Partial<Agent>)
          : {},
      accompanying: accompanyingDetails
        ? ({
            address: accompanyingDetails.appointmentAddress,
            date: accompanyingDetails.appointmentDate
              ? getDateObj(
                  accompanyingDetails.appointmentDate,
                  accompanyingDetails.appointmentTime || "00:00",
                )
              : undefined,
            phone: accompanyingDetails.refugeeNumber,
            name: accompanyingDetails.refugeeName,
            languageToTranslate: accompanyingDetails.appointmentLanguage,
          } as Partial<Accompanying>)
        : {},
      languages: dedupeLanguages([
        ...(body?.languagesMain || []).map((l) => ({
          id: l.id,
          purpose: LangPurpose.GENERAL,
        })),
        ...(body?.languagesResidents || []).map((l) => ({
          id: l.id,
          purpose: LangPurpose.TRANSLATION,
        })),
        ...(accompanyingDetails?.refugeeLanguage || []).map((l) => ({
          id: l.id,
          purpose: LangPurpose.TRANSLATION,
        })),
      ]) as DataId[],
      skills: (body?.skills || []) as DataId[],
      activities: (body?.activities || []) as DataId[],
      schedule: (body.schedule || []) as DataId[],
    }),
  };
}
