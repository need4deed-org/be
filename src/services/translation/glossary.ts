import { TranslationOrigin } from "need4deed-sdk";
import { dataSource } from "../../data/data-source";
import FieldTranslation from "../../data/entity/field_translation.entity";
import { getRepository } from "../../data/utils";
import { translatedEntities } from "./registry";
import { GlossaryEntry } from "./types";

// Domain terms the reference data doesn't cover (from the be#1065 spike).
export const DOMAIN_TERMS: readonly GlossaryEntry[] = [
  { de: "Aufnahmeeinrichtung", en: "reception facility" },
  { de: "Gemeinschaftsunterkunft", en: "shared accommodation" },
  { de: "Notunterkunft", en: "emergency shelter" },
  { de: "Unterkunft", en: "accommodation centre" },
  { de: "Ehrenamtliche", en: "volunteers" },
  { de: "Freiwillige", en: "volunteers" },
  { de: "Ehrenamt", en: "volunteering" },
  { de: "Bewohner*innen", en: "residents" },
  { de: "Bewohnende", en: "residents" },
  { de: "Geflüchtete", en: "refugees" },
  { de: "Sozialbetreuer*in", en: "social worker" },
  { de: "Sprachmittlung", en: "language mediation" },
  { de: "Sprachcafé", en: "language café" },
  { de: "Hausaufgabenhilfe", en: "homework help" },
  { de: "Kleiderkammer", en: "clothing store (donations)" },
  { de: "Kiez", en: "neighbourhood" },
  {
    de: "erweitertes Führungszeugnis",
    en: "extended certificate of good conduct",
  },
  { de: "Jobcenter", en: "Jobcenter" },
];

const MIN_TERM_LENGTH = 3;

/**
 * en/de pairs of every seeded reference title (skills, activities, languages,
 * agent types, …), one entry per source row. Read from field_translation, so
 * it follows whatever reference data the environment has.
 */
export async function loadReferenceGlossary(): Promise<GlossaryEntry[]> {
  const rows = await getRepository(dataSource, FieldTranslation).find({
    where: { origin: TranslationOrigin.REFERENCE, fieldName: "title" },
    relations: ["language"],
  });

  const fks = Object.values(translatedEntities).map(({ fk }) => fk);
  const bySource = new Map<string, Partial<GlossaryEntry>>();
  for (const row of rows) {
    const fk = fks.find((key) => row[key] !== null && row[key] !== undefined);
    const lang = row.language?.isoCode;
    if (!fk || !row.translation || (lang !== "de" && lang !== "en")) {
      continue;
    }
    const key = `${fk}:${row[fk]}`;
    bySource.set(key, { ...bySource.get(key), [lang]: row.translation });
  }

  return [...bySource.values()].filter(
    (entry): entry is GlossaryEntry =>
      Boolean(entry.de && entry.en) && entry.de !== entry.en,
  );
}

// Only the entries whose German or English term occurs in the text, so the
// prompt stays short (be#1065: a per-request glossary).
export function glossaryFor(
  text: string,
  entries: readonly GlossaryEntry[],
): GlossaryEntry[] {
  const haystack = text.toLowerCase();
  const seen = new Set<string>();
  return entries.filter(({ de, en }) => {
    const occurs = [de, en].some(
      (term) =>
        term.length >= MIN_TERM_LENGTH && haystack.includes(term.toLowerCase()),
    );
    const key = `${de}=${en}`;
    if (!occurs || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
