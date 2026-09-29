import { Lang } from "need4deed-sdk";

// Common function words: frequent in every text of the language, rare in the
// other one. Words common in both (e.g. "in", "so", "was", "an", "also")
// are left out.
const FUNCTION_WORDS: Record<Lang, ReadonlySet<string>> = {
  [Lang.DE]: new Set([
    "der",
    "die",
    "das",
    "den",
    "dem",
    "des",
    "und",
    "oder",
    "ist",
    "sind",
    "nicht",
    "mit",
    "für",
    "auf",
    "bei",
    "von",
    "zu",
    "zum",
    "zur",
    "ein",
    "eine",
    "einen",
    "einer",
    "wir",
    "sie",
    "du",
    "ihr",
    "uns",
    "auch",
    "wie",
    "wenn",
    "dass",
    "sich",
    "werden",
    "wird",
    "kann",
    "können",
    "haben",
    "hat",
    "gerne",
    "noch",
    "nach",
    "aus",
    "über",
    "unser",
    "unsere",
    "jeden",
    "jede",
  ]),
  [Lang.EN]: new Set([
    "the",
    "and",
    "or",
    "is",
    "are",
    "not",
    "with",
    "for",
    "on",
    "at",
    "of",
    "to",
    "a",
    "we",
    "you",
    "they",
    "our",
    "us",
    "how",
    "if",
    "that",
    "this",
    "will",
    "can",
    "have",
    "has",
    "be",
    "from",
    "who",
    "would",
    "every",
    "their",
    "your",
    "looking",
    "help",
  ]),
};

// Below this many words the counts are too small to tell.
export const LANGUAGE_HINT_MIN_WORDS = 12;

/**
 * de/en guess from function-word counts, or undefined when the text is too
 * short or not clearly one of the two. A heuristic for output validation
 * (validate.ts: a translation must be in its target language), not a
 * detector: it never decides what language a source text is in (be#1065
 * showed model-based detection is unreliable; the original language comes
 * from the request).
 */
export function languageHint(text: string): Lang | undefined {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < LANGUAGE_HINT_MIN_WORDS) {
    return undefined;
  }
  const count = (lang: Lang) =>
    words.filter((word) => FUNCTION_WORDS[lang].has(word)).length;
  const de = count(Lang.DE);
  const en = count(Lang.EN);
  // Clearly one language: at least 3 hits and twice as many as the other.
  if (de >= 3 && de >= 2 * en) {
    return Lang.DE;
  }
  if (en >= 3 && en >= 2 * de) {
    return Lang.EN;
  }
  return undefined;
}
