import { Lang } from "need4deed-sdk";
import { languageHint } from "./language-hint";
import { similarity, wordCount } from "./similarity";
import { TranslationErrorCode } from "./types";

export type ValidationResult =
  | { status: "ok" }
  | { status: "invalid"; code: TranslationErrorCode };

// Thresholds from the be#1065 spike, re-calibrated for this similarity
// measure on the spike's recorded outputs: cross-language translations of
// >= 12 words reached at most 0.45, same-language rewrites started at 0.77.
export const SAME_LANGUAGE_MIN_WORDS = 12;
export const SAME_LANGUAGE_MAX_SIMILARITY = 0.6;
const LENGTH_RATIO_MIN = 0.5;
const LENGTH_RATIO_MAX = 2;
const LENGTH_RATIO_MIN_CHARS = 20;
const UNTRANSLATED_MIN_WORDS = 4;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL = /https?:\/\/[^\s)]+/g;
// German numbers start with 0 or +; anything else (e.g. 2026-09-29) isn't one.
const PHONE = /(?:\+|\b0)\d[\d /-]{6,}\d/g;
const DATE = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/g;
const TIME = /\b(\d{1,2})[.:](\d{2})\b/g;
// Thousands grouping: "1.000" (German), "1,000" (English), "10 000".
const GROUPED_NUMBER = /\b\d{1,3}(?:[.,\u00a0 ]\d{3})+\b/g;
const NUMBER = /\d+/g;

// Numbers the model may write out ("1 Person" -> "One person").
const NUMBER_WORDS: Record<number, string[]> = {
  1: ["one", "ein", "eine", "einen", "einer"],
  2: ["two", "zwei"],
  3: ["three", "drei"],
  4: ["four", "vier"],
  5: ["five", "fünf"],
  6: ["six", "sechs"],
  7: ["seven", "sieben"],
  8: ["eight", "acht"],
  9: ["nine", "neun"],
  10: ["ten", "zehn"],
  11: ["eleven", "elf"],
  12: ["twelve", "zwölf"],
};

function trimTrailingPunctuation(token: string): string {
  return token.replace(/[.,;:!?]+$/, "");
}

// A number counts as present unless it's part of a longer number: "1"
// matches in "A1" (language level) and "01" (a copied date), not in "15".
function hasNumber(text: string, digits: string): boolean {
  return new RegExp(`(^|\\D)0*${digits}($|\\D)`).test(text);
}

// "1.000" may come back as "1,000", "1 000" or "1000".
function groupedNumberPresent(output: string, grouped: string): boolean {
  const digits = grouped.replace(/\D/g, "");
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }
  return new RegExp(`(^|\\D)${groups.join("[.,\\u00a0 ]?")}($|\\D)`).test(
    output,
  );
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\d])${word}($|[^\\p{L}\\d])`, "iu").test(text);
}

// Hours may switch between 24- and 12-hour notation ("16:30" -> "4:30 PM").
function hourVariants(hour: number): string[] {
  return hour > 12 ? [String(hour), String(hour - 12)] : [String(hour)];
}

function timePresent(output: string, hour: number, minutes: string): boolean {
  return hourVariants(hour).some(
    (h) =>
      new RegExp(`\\b0?${h}[.:]${minutes}\\b`).test(output) ||
      (minutes === "00" &&
        new RegExp(`\\b0?${h}\\s*(am|pm|a\\.m\\.|p\\.m\\.|uhr)`, "i").test(
          output,
        )),
  );
}

function numberPresent(output: string, value: number): boolean {
  return (
    hourVariants(value).some((n) => hasNumber(output, n)) ||
    (NUMBER_WORDS[value] ?? []).some((word) => hasWord(output, word))
  );
}

// Contact details must survive verbatim; numbers and times must keep their
// values but may change notation. Dates only need their day, since the
// month may be written out ("14.10." -> "October 14").
function tokensPreserved(source: string, output: string): boolean {
  const squash = (s: string) => s.replace(/[ /-]/g, "");
  const squashedOutput = squash(output);

  for (const email of source.match(EMAIL) ?? []) {
    if (!output.includes(email)) {
      return false;
    }
  }
  for (const url of source.match(URL) ?? []) {
    if (!output.includes(trimTrailingPunctuation(url))) {
      return false;
    }
  }
  for (const phone of source.match(PHONE) ?? []) {
    if (!squashedOutput.includes(squash(phone))) {
      return false;
    }
  }

  // Everything below works on what's left once those are taken out.
  let rest = source.replace(EMAIL, " ").replace(URL, " ").replace(PHONE, " ");
  // "15.30." at the end of a sentence is a time, not a date.
  let datesPreserved = true;
  rest = rest.replace(DATE, (match, day: string, month: string) => {
    if (Number(month) < 1 || Number(month) > 12) {
      return match;
    }
    datesPreserved &&= hasNumber(output, String(Number(day)));
    return " ";
  });
  if (!datesPreserved) {
    return false;
  }
  for (const [grouped] of rest.matchAll(GROUPED_NUMBER)) {
    if (!groupedNumberPresent(output, grouped)) {
      return false;
    }
  }
  rest = rest.replace(GROUPED_NUMBER, " ");
  for (const [, hour, minutes] of rest.matchAll(TIME)) {
    if (!timePresent(output, Number(hour), minutes)) {
      return false;
    }
  }
  rest = rest.replace(TIME, " ");
  for (const [number] of rest.matchAll(NUMBER)) {
    if (!numberPresent(output, Number(number))) {
      return false;
    }
  }
  return true;
}

/**
 * Checks a machine translation before it is stored (be#1067). Anything
 * invalid is stored as `failed` with the code, and readers serve the
 * original. The source is known to be in a different language than
 * `targetLang`: the caller never asks for the original language.
 */
export function validateTranslation(
  source: string,
  output: string,
  targetLang: Lang,
): ValidationResult {
  const invalid = (code: TranslationErrorCode): ValidationResult => ({
    status: "invalid",
    code,
  });
  const src = source.trim();
  const out = output.trim();

  if (!out) {
    return invalid("empty");
  }
  if (src.length > LENGTH_RATIO_MIN_CHARS) {
    const ratio = out.length / src.length;
    if (ratio < LENGTH_RATIO_MIN || ratio > LENGTH_RATIO_MAX) {
      return invalid("length_ratio");
    }
  }
  if (!tokensPreserved(src, out)) {
    return invalid("token_missing");
  }
  const words = wordCount(src);
  if (out === src) {
    return words >= UNTRANSLATED_MIN_WORDS
      ? invalid("untranslated")
      : { status: "ok" };
  }
  if (
    words >= SAME_LANGUAGE_MIN_WORDS &&
    similarity(src, out) > SAME_LANGUAGE_MAX_SIMILARITY
  ) {
    return invalid("source_is_target");
  }
  const hint = languageHint(out);
  if (hint !== undefined && hint !== targetLang) {
    return invalid("wrong_language");
  }
  return { status: "ok" };
}
