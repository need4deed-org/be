import { ApiOpportunityPatch, LangPurpose } from "need4deed-sdk";
import { getNameFields } from "..";
import { BadRequestError } from "../../config";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";
import Agent from "../../data/entity/opportunity/agent.entity";
import { getEmptyPropsNull } from "../../server/utils/common";
import { getDateObj } from "../utils";

export function parseOpportunity(body: ApiOpportunityPatch) {
  if (!body) {
    throw new BadRequestError("invalid body for parseOpportunity.");
  }
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
      accompanying: body?.accompanyingDetails
        ? ({
            address: body?.accompanyingDetails?.appointmentAddress,
            date: getDateObj(
              body?.accompanyingDetails?.appointmentDate,
              body?.accompanyingDetails?.appointmentTime,
            ),
            phone: body?.accompanyingDetails?.refugeeNumber,
            name: body?.accompanyingDetails?.refugeeName,
            languageToTranslate:
              body?.accompanyingDetails?.languagesToTranslate?.join(", "),
          } as Partial<Accompanying>)
        : {},
      languages: [
        ...(body?.languagesMain || []).map((l) => ({
          id: l.id,
          purpose: LangPurpose.GENERAL,
        })),
        ...(body?.languagesResidents || []).map((l) => ({
          id: l.id,
          purpose: LangPurpose.TRANSLATION,
        })),
      ] as Array<{ id: number }>,
      skills: (body?.skills || []) as Array<{ id: number }>,
      activities: (body?.activities || []) as Array<{ id: number }>,
      schedule: (body.schedule || []) as Array<{ id: number }>,
    }),
  };
}
