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
const MERIDIEMS: Record<Lang, string> = {
  [Lang.EN]: MERIDIEM,
  [Lang.DE]: NO_MERIDIEM,
};
const DAY_PART = "morgens|früh|vormittags|mittags|nachmittags|abends|nachts";
const H_HOUR = /\b(\d{1,2})\s*h\b/gi;
const RANGE_CONNECTOR = "(?:-|–|—|bis|und|oder|to|until|till|and|or)(?!\\p{L})";

// Groups: meridiem, uhr, day part, o'clock.
function clockSuffix(lang: Lang, required = false): string {
  const suffix = `\\s*(?:${MERIDIEMS[lang]}|(uhr)\\b(?:\\s+(${DAY_PART})(?!\\p{L}))?|(o['’]clock))`;
  return required ? `(?:${suffix})` : `(?:${suffix})?`;
}

function sourceTimePatterns(lang: Lang) {
  return {
    time: new RegExp(`\\b(\\d{1,2})[.:](\\d{2})\\b${clockSuffix(lang)}`, "giu"),
    fullHour: new RegExp(`\\b(\\d{1,2})${clockSuffix(lang, true)}`, "giu"),
    hourRangeStart: new RegExp(
      `(?<![.:,\\d])\\b(\\d{1,2})(?:[.:](\\d{2}))?(?![.:,]\\d)\\s*${RANGE_CONNECTOR}\\s*(?=(\\d{1,2})(?:[.:](\\d{2}))?(?:\\s*h\\b|${clockSuffix(lang, true)}))`,
      "giu",
    ),
  };
}

const SOURCE_TIME_PATTERNS: Record<
  Lang,
  ReturnType<typeof sourceTimePatterns>
> = {
  [Lang.EN]: sourceTimePatterns(Lang.EN),
  [Lang.DE]: sourceTimePatterns(Lang.DE),
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

type Clock = { meridiem?: string; uhr?: string; dayPart?: string };

function toClock([meridiem, uhr, dayPart]: (string | undefined)[]): Clock {
  return { meridiem, uhr, dayPart };
}

function clockHour(hour: number, { meridiem, dayPart }: Clock): number {
  if (meridiem) {
    return hour24(hour, meridiem);
  }
  if (!dayPart || hour > 12) {
    return hour;
  }
  switch (dayPart.toLowerCase()) {
    case "nachmittags":
    case "abends":
      return hour24(hour, "pm");
    case "mittags":
      return hour < 11 ? hour + 12 : hour;
    case "nachts":
      return hour === 12 ? 0 : hour >= 7 ? hour + 12 : hour;
    default:
      return hour24(hour, "am");
  }
}

function rangeStart(hour: number, end: number, endClock: Clock): number {
  const start = clockHour(hour, endClock);
  const borrowed = endClock.meridiem || endClock.dayPart;
  return !borrowed || start <= end ? start : (start + 12) % 24;
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

function clockMatches(h: number, hour: number, clock: Clock): boolean {
  if (clock.meridiem || clock.dayPart) {
    return sameHour(clockHour(h, clock), hour);
  }
  return !clock.uhr || sameHour(h, hour);
}

const CLOCK_PREPOSITION =
  "(?:(?<!\\p{L})(um|ab|bis|von|gegen|at|from|until)\\s+)?";
const timePatterns = new Map<string, RegExp>();

function timePattern(h: string, minutes: string, outputLang: Lang): RegExp {
  const key = `${outputLang}:${h}:${minutes}`;
  let pattern = timePatterns.get(key);
  if (!pattern) {
    const minutesPattern =
      minutes === "00"
        ? "(?!\\d)([.:]00(?!\\d))?(?![.:]\\d)"
        : `([.:]${minutes})(?!\\d)`;
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
    for (const [, preposition, withMinutes, ...suffix] of output.matchAll(
      timePattern(h, minutes, outputLang),
    )) {
      const clock = toClock(suffix);
      const oClock = suffix[3];
      const matches =
        withMinutes || clock.meridiem || clock.uhr || oClock
          ? clockMatches(Number(h), hour, clock)
          : Boolean(preposition) && sameHour(Number(h), hour);
      if (matches) {
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

// Groups: start clock (4), 24-hour end, 12-hour end, end clock (4).
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
    const endMinutes = "(?:[.:]\\d{2})?";
    const ends24 = hourForms(endVariants.filter(is24Hour), endMinutes);
    const ends12 = hourForms(
      endVariants.filter((h) => !is24Hour(h)),
      endMinutes,
    );
    pattern = new RegExp(
      `(?<![\\p{L}\\d])(?:${hourForms([startHour], "(?:[.:]00)?")})${clockSuffix(outputLang)}\\s*${RANGE_CONNECTOR}\\s*${RANGE_FILLER}(?:(${ends24})|(${ends12}))${clockSuffix(outputLang)}`,
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
      const startClock = toClock(match.slice(1, 4));
      const endClock = toClock(match.slice(7, 10));
      const twelveHourEnd =
        Boolean(match[6]) && (!endClock.uhr || Boolean(endClock.dayPart));
      if (
        clockMatches(Number(h), start, startClock) &&
        (!twelveHourStart ||
          startClock.meridiem ||
          startClock.dayPart ||
          twelveHourEnd)
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
  for (const [, hour, minutes, endHour, , ...endSuffix] of rest.matchAll(
    hourRangeStart,
  )) {
    const endClock = toClock(endSuffix);
    const end = clockHour(Number(endHour), endClock);
    const start = rangeStart(Number(hour), end, endClock);
    if (
      minutes
        ? !timePresent(output, start, minutes, outputLang)
        : !rangePresent(output, start, end, outputLang)
    ) {
      return "time_missing";
    }
  }
  rest = rest.replace(hourRangeStart, " ");
  for (const [, hour, minutes, ...suffix] of rest.matchAll(time)) {
    if (
      !timePresent(
        output,
        clockHour(Number(hour), toClock(suffix)),
        minutes,
        outputLang,
      )
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
  for (const [, hour, ...suffix] of rest.matchAll(fullHour)) {
    if (
      !timePresent(
        output,
        clockHour(Number(hour), toClock(suffix)),
        "00",
        outputLang,
      )
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
