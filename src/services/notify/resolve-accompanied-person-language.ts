import { Lang, TranslatedIntoType } from "need4deed-sdk";
import DealLanguage from "../../data/entity/m2m/deal-language";
import { formatAccompaniedPersonLanguage, getLanguages } from "../dto/utils";
import { DEAL_LANGUAGE_LABELS, resolveOrAlert } from "./resolve-or-alert";
import type { EmailTransport } from "./types";

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
