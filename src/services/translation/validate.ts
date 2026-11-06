import { Lang, TranslationErrorCode } from "need4deed-sdk";
import { languageHint } from "./language-hint";
import { similarity, wordCount } from "./similarity";

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
// German "am" is a preposition ("am Montag"), so German text has no meridiem.
const NO_MERIDIEM = "((?!))";
const H_HOUR = /\b(\d{1,2})\s*h\b/gi;
const RANGE_CONNECTOR = "(?:-|–|—|bis|und|oder|to|until|till|and|or)";

function sourceTimePatterns(meridiem: string) {
  return {
    time: new RegExp(`\\b(\\d{1,2})[.:](\\d{2})\\b(?:\\s*${meridiem})?`, "gi"),
    fullHour: new RegExp(`\\b(\\d{1,2})\\s*(?:uhr\\b|${meridiem})`, "gi"),
    hourRangeStart: new RegExp(
      `(?<![.:,\\d])\\b(\\d{1,2})(?:[.:](\\d{2}))?(?![.:,]\\d)\\s*${RANGE_CONNECTOR}\\s*(?=(\\d{1,2})(?:[.:](\\d{2}))?\\s*(?:uhr\\b|h\\b|${meridiem}))`,
      "gi",
    ),
  };
}

const SOURCE_TIME_PATTERNS: Record<
  Lang,
  ReturnType<typeof sourceTimePatterns>
> = {
  [Lang.EN]: sourceTimePatterns(MERIDIEM),
  [Lang.DE]: sourceTimePatterns(NO_MERIDIEM),
};
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

function rangeStart(hour: number, end: number, meridiem?: string): number {
  const start = hour24(hour, meridiem);
  if (!meridiem || start <= end) {
    return start;
  }
  return hour24(hour, /^p/i.test(meridiem) ? "am" : "pm");
}

function hourVariants(hour: number): string[] {
  if (hour === 0 || hour === 24) {
    return ["0", "24", "12"];
  }
  return hour > 12 ? [String(hour), String(hour - 12)] : [String(hour)];
}

function sameHour(a: number, b: number): boolean {
  return a % 24 === b % 24;
}

const DAY_PART_MERIDIEM: Record<string, string | undefined> = {
  morgens: "am",
  früh: "am",
  vormittags: "am",
  nachmittags: "pm",
  abends: "pm",
};

type ClockSuffix = {
  meridiem?: string;
  uhr?: string;
  dayPart?: string;
  oClock?: string;
};

function clockMatches(
  h: number,
  hour: number,
  { meridiem, uhr, dayPart }: ClockSuffix,
): boolean {
  if (meridiem) {
    return sameHour(hour24(h, meridiem), hour);
  }
  if (dayPart) {
    const dayPartMeridiem = DAY_PART_MERIDIEM[dayPart.toLowerCase()];
    return dayPartMeridiem
      ? sameHour(hour24(h, dayPartMeridiem), hour)
      : sameHour(h, hour) || sameHour(h + 12, hour);
  }
  return !uhr || sameHour(h, hour);
}

const OUTPUT_MERIDIEM: Record<Lang, string> = {
  [Lang.EN]: MERIDIEM,
  [Lang.DE]: NO_MERIDIEM,
};

function clockSuffix(outputLang: Lang): string {
  return `(?:\\s*(?:${OUTPUT_MERIDIEM[outputLang]}|(uhr)\\b(?:\\s+(morgens|früh|vormittags|mittags|nachmittags|abends|nachts)(?!\\p{L}))?|(o['’]clock)))?`;
}

function toClockSuffix([meridiem, uhr, dayPart, oClock]: (
  | string
  | undefined
)[]): ClockSuffix {
  return { meridiem, uhr, dayPart, oClock };
}

const CLOCK_PREPOSITION =
  "(?:(?<!\\p{L})(um|ab|bis|von|gegen|at|from|until)\\s+)?";
const timePatterns = new Map<string, RegExp>();

function timePattern(h: string, minutes: string, outputLang: Lang): RegExp {
  const key = `${outputLang}:${h}:${minutes}`;
  let pattern = timePatterns.get(key);
  if (!pattern) {
    const minutesPattern =
      minutes === "00" ? "([.:]00\\b)?" : `([.:]${minutes}\\b)`;
    pattern = new RegExp(
      `${CLOCK_PREPOSITION}\\b0?${h}${minutesPattern}${clockSuffix(outputLang)}`,
      "giu",
    );
    timePatterns.set(key, pattern);
  }
  return pattern;
}

function timePresent(
  output: string,
  hour: number,
  minutes: string,
  outputLang: Lang,
): boolean {
  for (const h of hourVariants(hour)) {
    for (const [, preposition, withMinutes, ...rest] of output.matchAll(
      timePattern(h, minutes, outputLang),
    )) {
      const suffix = toClockSuffix(rest);
      if (
        (withMinutes ||
          preposition ||
          suffix.meridiem ||
          suffix.uhr ||
          suffix.oClock) &&
        clockMatches(Number(h), hour, {
          ...suffix,
          uhr: suffix.uhr ?? preposition,
        })
      ) {
        return true;
      }
    }
  }
  return false;
}

function numberPresent(output: string, value: number): boolean {
  return (
    hasNumber(output, String(value)) ||
    (NUMBER_WORDS[value] ?? []).some((word) => hasWord(output, word))
  );
}

function hourPresent(output: string, hour: number, outputLang: Lang): boolean {
  return (
    numberPresent(output, hour) || timePresent(output, hour, "00", outputLang)
  );
}

function hourForms(hours: string[], minutes: string): string {
  const forms = hours.flatMap((h) => [
    `0?${h}${minutes}(?!\\d)`,
    ...(NUMBER_WORDS[Number(h)] ?? []).map((word) => `${word}(?!\\p{L})`),
  ]);
  return forms.length ? forms.join("|") : "(?!)";
}

const RANGE_FILLER = "(?:[\\p{L}.]+\\s+){0,2}";
const rangePatterns = new Map<string, RegExp>();

function rangePattern(
  startHour: string,
  end: number,
  outputLang: Lang,
): RegExp {
  const key = `${outputLang}:${startHour}-${end}`;
  let pattern = rangePatterns.get(key);
  if (!pattern) {
    const endVariants = hourVariants(end);
    const is24Hour = (h: string) => h === "0" || Number(h) > 12;
    const ends24 = hourForms(endVariants.filter(is24Hour), "(?:[.:]\\d{2})?");
    const ends12 = hourForms(
      endVariants.filter((h) => !is24Hour(h)),
      "(?:[.:]\\d{2})?",
    );
    pattern = new RegExp(
      `(?<![\\p{L}\\d])(?:${hourForms([startHour], "(?:[.:]00)?")})${clockSuffix(outputLang)}\\s*${RANGE_CONNECTOR}\\s*${RANGE_FILLER}(?:(${ends24})|(${ends12}))(\\s*uhr\\b)?`,
      "giu",
    );
    rangePatterns.set(key, pattern);
  }
  return pattern;
}

function rangePresent(
  output: string,
  start: number,
  end: number,
  outputLang: Lang,
): boolean {
  for (const h of hourVariants(start)) {
    // A 12-hour start without its own meridiem takes the end's, so the end must be in 12-hour form too.
    const twelveHourStart =
      start > 12 && start < 24 && Number(h) === start - 12;
    for (const match of output.matchAll(rangePattern(h, end, outputLang))) {
      const suffix = toClockSuffix(match.slice(1, 5));
      const [, , , , , , end12, endUhr] = match;
      const ownMeridiem = suffix.meridiem || suffix.dayPart;
      if (
        clockMatches(Number(h), start, suffix) &&
        (!twelveHourStart || ownMeridiem || (end12 && !endUhr))
      ) {
        return true;
      }
    }
  }
  return false;
}

function missingToken(
  source: string,
  output: string,
  sourceLang: Lang,
): TranslationErrorCode | undefined {
  const { time, fullHour, hourRangeStart } = SOURCE_TIME_PATTERNS[sourceLang];
  const outputLang = sourceLang === Lang.DE ? Lang.EN : Lang.DE;
  const squash = (s: string) => s.replace(/[ /-]/g, "");
  const squashedOutput = squash(output);

  for (const url of source.match(URL) ?? []) {
    if (!output.includes(trimTrailingPunctuation(url))) {
      return "url_missing";
    }
  }
  for (const email of source.match(EMAIL) ?? []) {
    if (!output.includes(email)) {
      return "email_missing";
    }
  }
  for (const phone of source.match(PHONE) ?? []) {
    if (!squashedOutput.includes(squash(phone))) {
      return "phone_missing";
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
    return "date_missing";
  }
  for (const [, hour, minutes, endHour, , meridiem] of rest.matchAll(
    hourRangeStart,
  )) {
    const end = hour24(Number(endHour), meridiem);
    const start = rangeStart(Number(hour), end, meridiem);
    if (
      minutes
        ? !timePresent(output, start, minutes, outputLang)
        : !rangePresent(output, start, end, outputLang)
    ) {
      return "time_missing";
    }
  }
  rest = rest.replace(hourRangeStart, " ");
  for (const [, hour, minutes, meridiem] of rest.matchAll(time)) {
    if (
      !timePresent(output, hour24(Number(hour), meridiem), minutes, outputLang)
    ) {
      return "time_missing";
    }
  }
  rest = rest.replace(time, " ");
  for (const [, hour] of rest.matchAll(H_HOUR)) {
    if (!hourPresent(output, Number(hour), outputLang)) {
      return "time_missing";
    }
  }
  rest = rest.replace(H_HOUR, " ");
  for (const [, hour, meridiem] of rest.matchAll(fullHour)) {
    if (
      !timePresent(output, hour24(Number(hour), meridiem), "00", outputLang)
    ) {
      return "time_missing";
    }
  }
  const numbersOutput = collapseGrouping(output);
  rest = collapseGrouping(rest.replace(fullHour, " ")).replace(
    SPACE_GROUPED,
    (grouped) =>
      hasNumber(numbersOutput, grouped.replace(/\D/g, "")) ? " " : grouped,
  );
  for (const [number] of rest.matchAll(NUMBER)) {
    if (!numberPresent(numbersOutput, Number(number))) {
      return "number_missing";
    }
  }
  return undefined;
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
  const sourceLang = targetLang === Lang.DE ? Lang.EN : Lang.DE;
  const missing = missingToken(src, out, sourceLang);
  if (missing) {
    return invalid(missing);
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
