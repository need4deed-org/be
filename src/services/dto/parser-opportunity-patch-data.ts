import { ApiOpportunityPatch, LangPurpose } from "need4deed-sdk";
import { getNameFields } from "..";
import { BadRequestError } from "../../config";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";
import Agent from "../../data/entity/opportunity/agent.entity";
import { DataId } from "../../server/types";
import { getEmptyPropsNull } from "../../server/utils/common";
import { getDateObj } from "../utils";

type LanguagePatchItem = { id: number | string; purpose: LangPurpose };

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
  return {
    ...getEmptyPropsNull({
      opportunity: {
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
      agent: body?.agent
        ? ({
            title: body?.agent?.name,
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
