import { Lang, TranslatedIntoType } from "need4deed-sdk";
import DealLanguage from "../../data/entity/m2m/deal-language";
import { formatAccompaniedPersonLanguage, getLanguages } from "../dto/utils";
import { DEAL_LANGUAGE_LABELS, resolveOrAlert } from "./resolve-or-alert";
import type { EmailTransport } from "./types";

// Shared by every accompanying email that renders the accompanied person's
// translation-target requirement combined with the deal's requested
// language(s) into a single "Target-Source" pair (e.g. "Deutsch-Arabisch")
// — was independently duplicated across email-new-accompanying.ts,
// email-accompany-match-volunteer.ts and email-suggestion-accompanying.ts
// (be#1047 review); a future change to the resolution/fallback logic only
// needs to happen here.
//
// Returns the pair in both languages (be#1075): the German one from the
// field_translation the caller loads beforehand (be#856), the English one
// from the language's raw title, which is English.
export async function resolveAccompaniedPersonLanguage(
  errorTransport: EmailTransport,
  languageToTranslate: TranslatedIntoType | undefined,
  dealLanguage: DealLanguage[],
  context: string,
): Promise<Record<Lang, string>> {
  const titles = await resolveOrAlert(
    errorTransport,
    dealLanguage,
    (dl) => ({
      [Lang.DE]: getLanguages(dl).map((l) => l.title),
      [Lang.EN]: dl.map((pl) => pl.language.title),
    }),
    { [Lang.DE]: [], [Lang.EN]: [] } as Record<Lang, string[]>,
    context,
    DEAL_LANGUAGE_LABELS,
  );
  return {
    [Lang.DE]: formatAccompaniedPersonLanguage(
      languageToTranslate,
      titles[Lang.DE],
      Lang.DE,
    ),
    [Lang.EN]: formatAccompaniedPersonLanguage(
      languageToTranslate,
      titles[Lang.EN],
      Lang.EN,
    ),
  };
}
