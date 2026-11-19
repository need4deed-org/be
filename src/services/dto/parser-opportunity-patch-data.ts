import {
  ApiOpportunityPatch,
  LangPurpose,
  OPPORTUNITY_DESCRIPTION_MAX_LENGTH,
  OPPORTUNITY_TITLE_MAX_LENGTH,
} from "need4deed-sdk";
import { In, Repository } from "typeorm";
import { BadRequestError } from "../../config";
import Accompanying from "../../data/entity/opportunity/accompanying.entity";
import Agent from "../../data/entity/opportunity/agent.entity";
import Opportunity from "../../data/entity/opportunity/opportunity.entity";
import Language from "../../data/entity/profile/language.entity";
import { DataId } from "../../server/types";
import { getEmptyPropsNull } from "../../server/utils/common";
import { textLength } from "../translation/queue";
import { getDateObj } from "../utils";
import { getOpportunityDescription } from "./dto-opportunity";

type LanguagePatchItem = { id: number | string; purpose: LangPurpose };

export function assertOpportunityTextLengths(
  patch: Partial<Opportunity>,
  current: Opportunity,
) {
  assertTextLength(
    "title",
    [patch.title],
    current.title,
    OPPORTUNITY_TITLE_MAX_LENGTH,
  );
  assertTextLength(
    "description",
    [patch.info, patch.infoConfidential],
    getOpportunityDescription(current),
    OPPORTUNITY_DESCRIPTION_MAX_LENGTH,
  );
}

function assertTextLength(
  label: string,
  values: (string | null | undefined)[],
  current: string | null | undefined,
  maxLength: number,
) {
  const allowed = Math.max(maxLength, textLength(current));
  for (const value of values) {
    if (textLength(value) > allowed) {
      throw new BadRequestError(
        `A ${label} can't be longer than ${allowed} characters.`,
      );
    }
  }
}

export async function assertValidMainCommunicationLanguages(
  languagesMain: { id: number | string }[] | undefined,
  languageRepository: Repository<Language>,
): Promise<void> {
  if (!languagesMain?.length) {
    return;
  }
  const ids = [...new Set(languagesMain.map(({ id }) => Number(id)))];
  const languages = await languageRepository.findBy({ id: In(ids) });
  if (languages.length !== ids.length) {
    throw new BadRequestError(
      "Main communication language must be German, English, or both.",
    );
  }
  const isoCodes = new Set(languages.map((l) => l.isoCode));
  const isOnlyGermanOrEnglish = [...isoCodes].every(
    (code) => code === "de" || code === "en",
  );

  if (!isOnlyGermanOrEnglish) {
    throw new BadRequestError(
      "Main communication language must be German, English, or both.",
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
        info: body.description as string | null | undefined,
        infoConfidential: body.description as string | null | undefined,
        type: body.opportunity_type,
      },
      agent:
        agentBody && agentBody.id === undefined
          ? ({
              title: agentBody.name,
            } as Partial<Agent>)
          : {},
      accompanying: accompanyingDetails
        ? ({
            address: accompanyingDetails.appointmentAddress,
            phone: accompanyingDetails.refugeeNumber,
            name: accompanyingDetails.refugeeName,
            languageToTranslate: accompanyingDetails.appointmentLanguage,
          } as Partial<Accompanying>)
        : {},
      onetimerDate: accompanyingDetails?.appointmentDate
        ? getDateObj(
            accompanyingDetails.appointmentDate,
            accompanyingDetails.appointmentTime || "00:00",
          )
        : undefined,
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
