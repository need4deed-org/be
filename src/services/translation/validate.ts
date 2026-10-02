import { Lang } from "need4deed-sdk";
import { languageHint } from "./language-hint";
import { similarity, wordCount } from "./similarity";
import { TranslationErrorCode } from "./types";

export type ValidationResult =
  | { status: "ok" }
  | { status: "invalid"; code: TranslationErrorCode };

export const SAME_LANGUAGE_MIN_WORDS = 12;
export const SAME_LANGUAGE_MAX_SIMILARITY = 0.6;
const LENGTH_RATIO_MIN = 0.5;
const LENGTH_RATIO_MAX = 2;
const LENGTH_RATIO_MIN_CHARS = 20;
const UNTRANSLATED_MIN_WORDS = 4;

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL = /https?:\/\/[^\s)]+/g;

const PHONE = /(?:\+|\b0)\d[\d /-]{6,}\d/g;
const DATE = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/g;

const MERIDIEM = "(a\\.m\\.|p\\.m\\.|am|pm)(?![a-z])";
const TIME = new RegExp(
  `\\b(\\d{1,2})[.:](\\d{2})\\b(?:\\s*${MERIDIEM})?`,
  "gi",
);
const FULL_HOUR = new RegExp(`\\b(\\d{1,2})\\s*(?:uhr\\b|${MERIDIEM})`, "gi");

const GROUPED_NUMBER = /\b\d{1,3}(?:[.,\u00a0]\d{3})+\b/g;
const SPACE_GROUPED = /\b\d{1,3}(?: \d{3})+\b/g;

function collapseGrouping(text: string): string {
  return text.replace(GROUPED_NUMBER, (grouped) => grouped.replace(/\D/g, ""));
}
const NUMBER = /\d+/g;

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

function hasNumber(text: string, digits: string): boolean {
  return new RegExp(`(^|\\D)0*${digits}($|\\D)`).test(text);
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\d])${word}($|[^\\p{L}\\d])`, "iu").test(text);
}

function hour24(hour: number, meridiem?: string): number {
  const m = meridiem?.toLowerCase().replace(/\./g, "");
  if (m === "pm" && hour < 12) {
    return hour + 12;
  }
  if (m === "am" && hour === 12) {
    return 0;
  }
  return hour;
}

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
    hasNumber(output, String(value)) ||
    (NUMBER_WORDS[value] ?? []).some((word) => hasWord(output, word))
  );
}

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

  let rest = source.replace(EMAIL, " ").replace(URL, " ").replace(PHONE, " ");
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
  for (const [, hour, minutes, meridiem] of rest.matchAll(TIME)) {
    if (!timePresent(output, hour24(Number(hour), meridiem), minutes)) {
      return false;
    }
  }
  rest = rest.replace(TIME, " ");
  for (const [, hour, meridiem] of rest.matchAll(FULL_HOUR)) {
    if (!timePresent(output, hour24(Number(hour), meridiem), "00")) {
      return false;
    }
  }
  const numbersOutput = collapseGrouping(output);
  rest = collapseGrouping(rest.replace(FULL_HOUR, " ")).replace(
    SPACE_GROUPED,
    (grouped) =>
      hasNumber(numbersOutput, grouped.replace(/\D/g, "")) ? " " : grouped,
  );
  for (const [number] of rest.matchAll(NUMBER)) {
    if (!numberPresent(numbersOutput, Number(number))) {
      return false;
    }
  }
  return true;
}

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
