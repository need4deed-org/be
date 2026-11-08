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
const MERIDIEM = "(?:a\\.m\\.|p\\.m\\.|am|pm)(?![a-z])";
// German "am" is a preposition ("am Montag"), not a meridiem.
const GERMAN_MERIDIEM = "(?:a\\.m\\.|p\\.m\\.|pm)(?![a-z])";
const MERIDIEMS: Record<Lang, string> = {
  [Lang.EN]: MERIDIEM,
  [Lang.DE]: GERMAN_MERIDIEM,
};
const DAY_PART =
  "morgens|früh|vormittags|mittags|nachmittags|abends|nachts|am\\s+(?:morgen|vormittag|mittag|nachmittag|abend)|in\\s+der\\s+nacht";
const H_HOUR = /\b(\d{1,2})\s*h\b/gi;
const RANGE_CONNECTOR = "(?:-|–|—|bis|und|oder|to|until|till|and|or)(?!\\p{L})";

function groupName(prefix: string, group: string): string {
  return prefix ? `${prefix}${group[0].toUpperCase()}${group.slice(1)}` : group;
}

function clockSuffix(lang: Lang, prefix = "", required = false): string {
  const name = (group: string) => groupName(prefix, group);
  const suffix = `\\s*(?:(?<${name("meridiem")}>${MERIDIEMS[lang]})|(?<${name("uhr")}>uhr)\\b(?:\\s+(?<${name("dayPart")}>${DAY_PART})(?!\\p{L}))?|(?<${name("oClock")}>o['’]clock))`;
  return required ? suffix : `(?:${suffix})?`;
}

function sourceTimePatterns(lang: Lang) {
  return {
    time: new RegExp(
      `\\b(?<hour>\\d{1,2})[.:](?<minutes>\\d{2})\\b${clockSuffix(lang)}`,
      "giu",
    ),
    fullHour: new RegExp(
      `\\b(?<hour>\\d{1,2})${clockSuffix(lang, "", true)}`,
      "giu",
    ),
    hourRange: new RegExp(
      `(?<![.:,\\d])\\b(?<hour>\\d{1,2})(?:[.:](?<minutes>\\d{2}))?(?![.:,]\\d)\\s*${RANGE_CONNECTOR}\\s*(?<endHour>\\d{1,2})(?:[.:](?<endMinutes>\\d{2}))?(?:\\s*h\\b|${clockSuffix(lang, "end", true)})`,
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

type Clock = {
  meridiem?: string;
  uhr?: string;
  dayPart?: string;
  oClock?: string;
};

function toClock(
  groups: Record<string, string | undefined> = {},
  prefix = "",
): Clock {
  const group = (name: string) => groups[groupName(prefix, name)];
  return {
    meridiem: group("meridiem"),
    uhr: group("uhr"),
    dayPart: group("dayPart"),
    oClock: group("oClock"),
  };
}

function clockHour(hour: number, { meridiem, dayPart }: Clock): number {
  if (meridiem) {
    return hour24(hour, meridiem);
  }
  if (!dayPart || hour > 12) {
    return hour;
  }
  const part = dayPart
    .toLowerCase()
    .replace(/^(?:am|in\s+der)\s+/, "")
    .replace(/s$/, "");
  switch (part) {
    case "nachmittag":
      return hour24(hour, "pm");
    case "abend":
      return hour === 12 ? 0 : hour24(hour, "pm");
    case "mittag":
      return hour <= 4 ? hour + 12 : hour;
    case "nacht":
      return hour === 12 ? 0 : hour >= 7 ? hour + 12 : hour;
    default:
      return hour;
  }
}

function rangeStart(hour: number, end: number, endClock: Clock): number {
  const start = clockHour(hour, endClock);
  if (!endClock.meridiem && !endClock.dayPart) {
    return start;
  }
  const other = (start + 12) % 24;
  const duration = (from: number) => (end - from + 24) % 24;
  return duration(other) < duration(start) ? other : start;
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

function clockMatches(
  h: number,
  hour: number,
  clock: Clock,
  outputLang: Lang,
): boolean {
  if (clock.meridiem || clock.dayPart) {
    return sameHour(clockHour(h, clock), hour);
  }
  if (sameHour(h, hour)) {
    return true;
  }
  // German readers take a bare 12-hour time as 24-hour, and anyone takes a bare 12 as noon.
  return !(clock.uhr || clock.oClock) && outputLang === Lang.EN && h !== 12;
}

const PATTERN_CACHE_LIMIT = 500;

function cachedPattern(
  cache: Map<string, RegExp>,
  key: string,
  build: () => RegExp,
): RegExp {
  let pattern = cache.get(key);
  if (!pattern) {
    if (cache.size >= PATTERN_CACHE_LIMIT) {
      cache.clear();
    }
    pattern = build();
    cache.set(key, pattern);
  }
  return pattern;
}

const NOT_AFTER_DIGITS = "(?<!\\d)(?<!\\d[.:])";
const timePatterns = new Map<string, RegExp>();

function timePattern(h: string, minutes: string, outputLang: Lang): RegExp {
  return cachedPattern(timePatterns, `${outputLang}:${h}:${minutes}`, () => {
    const minutesPattern =
      minutes === "00"
        ? "(?!\\d)(?<withMinutes>[.:]00(?!\\d))?(?![.:]\\d)"
        : `(?<withMinutes>[.:]${minutes})(?!\\d)`;
    return new RegExp(
      `${NOT_AFTER_DIGITS}\\b0?${h}${minutesPattern}${clockSuffix(outputLang)}`,
      "giu",
    );
  });
}

function timePresent(
  output: string,
  hour: number,
  minutes: string,
  outputLang: Lang,
): boolean {
  for (const h of hourVariants(hour)) {
    for (const { groups } of output.matchAll(
      timePattern(h, minutes, outputLang),
    )) {
      const clock = toClock(groups);
      if (
        (groups?.withMinutes || clock.meridiem || clock.uhr || clock.oClock) &&
        clockMatches(Number(h), hour, clock, outputLang)
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

function hourForms(hours: string[], minutes: string, words = true): string {
  const forms = hours.flatMap((h) => [
    `0?${h}${minutes}(?!\\d)`,
    ...(words ? (NUMBER_WORDS[Number(h)] ?? []) : []).map(
      (word) => `${word}(?!\\p{L})`,
    ),
  ]);
  return forms.length ? forms.join("|") : "(?!)";
}

const RANGE_FILLER = "(?:\\p{L}+\\.\\s*|\\p{L}+\\s+|[~≈]\\s*){0,2}";
const rangePatterns = new Map<string, RegExp>();

function hourMinuteForms(hours: string[], minutes: string): string {
  return minutes === "00"
    ? hourForms(hours, "(?:[.:]00)?(?![.:]\\d)")
    : hourForms(hours, `[.:]${minutes}`, false);
}

function rangePattern(
  startHour: string,
  startMinutes: string,
  end: number,
  endMinutes: string,
  outputLang: Lang,
): RegExp {
  const key = `${outputLang}:${startHour}:${startMinutes}-${end}:${endMinutes}`;
  return cachedPattern(rangePatterns, key, () => {
    const starts = hourMinuteForms([startHour], startMinutes);
    const endVariants = hourVariants(end);
    const is24Hour = (h: string) => h === "0" || Number(h) > 12;
    const ends24 = hourMinuteForms(endVariants.filter(is24Hour), endMinutes);
    const ends12 = hourMinuteForms(
      endVariants.filter((h) => !is24Hour(h)),
      endMinutes,
    );
    return new RegExp(
      `(?<!\\p{L})${NOT_AFTER_DIGITS}(?:${starts})${clockSuffix(outputLang, "start")}\\s*${RANGE_CONNECTOR}\\s*${RANGE_FILLER}(?:(?<end24>${ends24})|(?<end12>${ends12}))${clockSuffix(outputLang, "end")}`,
      "giu",
    );
  });
}

function rangeEndMatches(
  groups: Record<string, string | undefined>,
  end: number,
  endClock: Clock,
  outputLang: Lang,
): boolean {
  if (groups.end24 !== undefined) {
    return !endClock.meridiem;
  }
  const h = end % 12 || 12;
  if (endClock.meridiem || endClock.dayPart) {
    return sameHour(clockHour(h, endClock), end);
  }
  return (
    h === end ||
    (/[.:]/.test(groups.end12 ?? "") &&
      clockMatches(h, end, endClock, outputLang))
  );
}

function borrowsEndMeridiem(
  groups: Record<string, string | undefined> | undefined,
  startClock: Clock,
  endClock: Clock,
  outputLang: Lang,
): boolean {
  if (!groups?.end12) {
    return false;
  }
  if (endClock.dayPart) {
    return true;
  }
  if (startClock.uhr) {
    return false;
  }
  return (
    Boolean(endClock.meridiem) ||
    (outputLang === Lang.EN &&
      !endClock.uhr &&
      !endClock.oClock &&
      /[.:]/.test(groups.end12))
  );
}

function rangePresent(
  output: string,
  start: number,
  startMinutes: string,
  end: number,
  endMinutes: string,
  outputLang: Lang,
): boolean {
  for (const h of hourVariants(start)) {
    for (const { groups } of output.matchAll(
      rangePattern(h, startMinutes, end, endMinutes, outputLang),
    )) {
      const startClock = toClock(groups, "start");
      const endClock = toClock(groups, "end");
      const ownClock =
        startClock.meridiem || startClock.dayPart || sameHour(Number(h), start);
      if (
        groups &&
        rangeEndMatches(groups, end, endClock, outputLang) &&
        (ownClock
          ? clockMatches(Number(h), start, startClock, outputLang)
          : borrowsEndMeridiem(groups, startClock, endClock, outputLang))
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
  targetLang: Lang,
): TranslationErrorCode | undefined {
  const sourceLang = targetLang === Lang.DE ? Lang.EN : Lang.DE;
  const { time, fullHour, hourRange } = SOURCE_TIME_PATTERNS[sourceLang];
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
  for (const { groups = {} } of rest.matchAll(hourRange)) {
    const endClock = toClock(groups, "end");
    const end = clockHour(Number(groups.endHour), endClock);
    const start = rangeStart(Number(groups.hour), end, endClock);
    const startMinutes = groups.minutes || "00";
    const endMinutes = groups.endMinutes || "00";
    if (
      !rangePresent(output, start, startMinutes, end, endMinutes, targetLang)
    ) {
      return "time_missing";
    }
  }
  rest = rest.replace(hourRange, " ");
  for (const { groups = {} } of rest.matchAll(time)) {
    const hour = clockHour(Number(groups.hour), toClock(groups));
    if (!timePresent(output, hour, groups.minutes, targetLang)) {
      return "time_missing";
    }
  }
  rest = rest.replace(time, " ");
  for (const [, hour] of rest.matchAll(H_HOUR)) {
    if (!hourPresent(output, Number(hour), targetLang)) {
      return "time_missing";
    }
  }
  rest = rest.replace(H_HOUR, " ");
  for (const { groups = {} } of rest.matchAll(fullHour)) {
    const hour = clockHour(Number(groups.hour), toClock(groups));
    if (!timePresent(output, hour, "00", targetLang)) {
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
  const missing = missingToken(src, out, targetLang);
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
