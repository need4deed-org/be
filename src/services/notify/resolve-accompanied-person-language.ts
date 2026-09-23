import { TranslatedIntoType } from "need4deed-sdk";
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
export async function resolveAccompaniedPersonLanguage(
  errorTransport: EmailTransport,
  languageToTranslate: TranslatedIntoType | undefined,
  dealLanguage: DealLanguage[],
  context: string,
): Promise<string> {
  const dealLanguageTitles = await resolveOrAlert(
    errorTransport,
    dealLanguage,
    (dl) => getLanguages(dl).map((l) => l.title),
    [] as string[],
    context,
    DEAL_LANGUAGE_LABELS,
  );
  return formatAccompaniedPersonLanguage(
    languageToTranslate,
    dealLanguageTitles,
  );
}
