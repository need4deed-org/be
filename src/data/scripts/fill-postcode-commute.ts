import "reflect-metadata";
import { berlinToday, isWorkingDay } from "need4deed-sdk";
import { DataSource, In, IsNull, Not } from "typeorm";
import logger from "../../logger";
import { berlinDayBoundaries } from "../../services/jobs/berlin-dates";
import { dataSource } from "../data-source";
import PostcodeCommute from "../entity/location/postcode-commute.entity";
import Postcode from "../entity/location/postcode.entity";

const VBB_JOURNEYS_URL = "https://v6.vbb.transport.rest/journeys";
const TUESDAY = 2;
const DEPARTURE_HOUR = 10;
const REQUESTS_PER_MINUTE = 90;
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 15_000;
const REQUEST_TIMEOUT_MS = 30_000;
const PROGRESS_EVERY = 100;
const MAX_CONSECUTIVE_FAILURES = 10;

export interface FillPostcodeCommuteOptions {
  refresh: boolean;
  dryRun: boolean;
  postcodes?: string[];
}

export interface CommutePoint {
  id: number;
  value: string;
  latitude: number;
  longitude: number;
}

interface VbbLeg {
  departure?: string | null;
  plannedDeparture?: string | null;
  arrival?: string | null;
  plannedArrival?: string | null;
}

export interface VbbJourneysResponse {
  journeys?: { legs: VbbLeg[] }[];
}

export interface FillPostcodeCommuteDeps {
  fetchJourneys: (url: string) => Promise<VbbJourneysResponse>;
  sleep: (ms: number) => Promise<void>;
  departure: Date;
  maxConsecutiveFailures: number;
}

export interface FillPostcodeCommuteReport {
  pending: number;
  saved: number;
  noJourney: { from: string; to: string }[];
  failed: { from: string; to: string; error: string }[];
  stoppedEarly: boolean;
}

export function parseArgs(argv: string[]): FillPostcodeCommuteOptions {
  const options: FillPostcodeCommuteOptions = {
    refresh: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--refresh") {
      options.refresh = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--postcodes") {
      const raw = argv[++i];
      if (!raw || raw.startsWith("--")) {
        throw new Error(
          "--postcodes requires a comma-separated list, e.g. --postcodes 10178,12043",
        );
      }
      options.postcodes = raw.split(",");
      if (options.postcodes.some((value) => !/^\d{5}$/.test(value))) {
        throw new Error(
          `--postcodes must be a comma-separated list of 5-digit postcodes, got "${raw}"`,
        );
      }
    } else {
      throw new Error(`Unknown argument "${arg}"`);
    }
  }
  return options;
}

export function nextTuesdayDeparture(today: Date = berlinToday()): Date {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  do {
    day.setDate(day.getDate() + 1);
  } while (day.getDay() !== TUESDAY || !isWorkingDay(day));
  const { startOfDay } = berlinDayBoundaries(day);
  return new Date(startOfDay.getTime() + DEPARTURE_HOUR * 60 * 60 * 1000);
}

export function orderedPairs<T>(points: T[]): [T, T][] {
  return points.flatMap((from) =>
    points.filter((to) => to !== from).map((to): [T, T] => [from, to]),
  );
}

export function journeysUrl(
  from: CommutePoint,
  to: CommutePoint,
  departure: Date,
): string {
  const params = new URLSearchParams({
    "from.latitude": String(from.latitude),
    "from.longitude": String(from.longitude),
    "from.address": from.value,
    "to.latitude": String(to.latitude),
    "to.longitude": String(to.longitude),
    "to.address": to.value,
    departure: departure.toISOString(),
    results: "3",
    stopovers: "false",
    remarks: "false",
    polylines: "false",
  });
  return `${VBB_JOURNEYS_URL}?${params}`;
}

export function shortestJourneyMinutes(
  response: VbbJourneysResponse,
): number | null {
  const durations = (response.journeys ?? []).flatMap(({ legs }) => {
    const first = legs[0];
    const last = legs[legs.length - 1];
    const departure = first?.plannedDeparture ?? first?.departure;
    const arrival = last?.plannedArrival ?? last?.arrival;
    if (!departure || !arrival) {
      return [];
    }
    const ms = Date.parse(arrival) - Date.parse(departure);
    return Number.isFinite(ms) && ms >= 0 ? [Math.round(ms / 60_000)] : [];
  });
  return durations.length ? Math.min(...durations) : null;
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchVbbJourneys(
  url: string,
  sleep: (ms: number) => Promise<void> = defaultSleep,
  fetchFn: typeof fetch = fetch,
): Promise<VbbJourneysResponse> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchFn(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        return (await response.json()) as VbbJourneysResponse;
      }
      lastError = `HTTP ${response.status}`;
      if (!isRetryable(response.status)) {
        break;
      }
    } catch (err) {
      const { name, message } = err as Error;
      lastError = `${name}: ${message}`;
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_BASE_MS * attempt);
    }
  }
  throw new Error(lastError);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pairKey = (fromId: number, toId: number) => `${fromId}>${toId}`;

async function findPoints(
  ds: DataSource,
  postcodes?: string[],
): Promise<CommutePoint[]> {
  const rows = await ds.getRepository(Postcode).find({
    select: { id: true, value: true, latitude: true, longitude: true },
    where: {
      latitude: Not(IsNull()),
      longitude: Not(IsNull()),
      ...(postcodes ? { value: In(postcodes) } : {}),
    },
    order: { id: "ASC" },
  });
  return rows as CommutePoint[];
}

async function findExistingPairs(
  ds: DataSource,
  pointIds: number[],
): Promise<Set<string>> {
  const rows = await ds.getRepository(PostcodeCommute).find({
    select: { fromPostcodeId: true, toPostcodeId: true },
    where: { fromPostcodeId: In(pointIds), toPostcodeId: In(pointIds) },
  });
  return new Set(
    rows.map((row) => pairKey(row.fromPostcodeId, row.toPostcodeId)),
  );
}

export async function runFill(
  ds: DataSource,
  options: FillPostcodeCommuteOptions,
  deps: FillPostcodeCommuteDeps,
): Promise<FillPostcodeCommuteReport> {
  const points = await findPoints(ds, options.postcodes);
  const existing = options.refresh
    ? new Set<string>()
    : await findExistingPairs(
        ds,
        points.map((point) => point.id),
      );
  const pairs = orderedPairs(points).filter(
    ([from, to]) => !existing.has(pairKey(from.id, to.id)),
  );
  const report: FillPostcodeCommuteReport = {
    pending: pairs.length,
    saved: 0,
    noJourney: [],
    failed: [],
    stoppedEarly: false,
  };
  logger.info(
    `${pairs.length} of ${points.length * (points.length - 1)} pair(s) to fetch, departure ${deps.departure.toISOString()}`,
  );
  if (options.dryRun) {
    return report;
  }

  const repository = ds.getRepository(PostcodeCommute);
  const intervalMs = 60_000 / REQUESTS_PER_MINUTE;
  let lastRequestAt = 0;
  let consecutiveFailures = 0;

  for (const [index, [from, to]] of pairs.entries()) {
    const wait = lastRequestAt + intervalMs - Date.now();
    if (wait > 0) {
      await deps.sleep(wait);
    }
    lastRequestAt = Date.now();

    try {
      const minutes = shortestJourneyMinutes(
        await deps.fetchJourneys(journeysUrl(from, to, deps.departure)),
      );
      consecutiveFailures = 0;
      if (minutes === null) {
        report.noJourney.push({ from: from.value, to: to.value });
      } else {
        await repository.upsert(
          {
            fromPostcodeId: from.id,
            toPostcodeId: to.id,
            minutes,
            updatedAt: new Date(),
          },
          ["fromPostcodeId", "toPostcodeId"],
        );
        report.saved++;
      }
    } catch (err) {
      report.failed.push({
        from: from.value,
        to: to.value,
        error: (err as Error).message,
      });
      if (++consecutiveFailures >= deps.maxConsecutiveFailures) {
        report.stoppedEarly = true;
        break;
      }
    }

    if ((index + 1) % PROGRESS_EVERY === 0) {
      logger.info(
        `${index + 1}/${pairs.length}: ${report.saved} saved, ${report.noJourney.length} without journey, ${report.failed.length} failed`,
      );
    }
  }
  return report;
}

function printReport(report: FillPostcodeCommuteReport, dryRun: boolean) {
  if (dryRun) {
    logger.info(`Dry run: ${report.pending} pair(s) would be fetched.`);
    return;
  }
  logger.info(
    `Done: ${report.saved} of ${report.pending} pair(s) saved, ${report.noJourney.length} without journey, ${report.failed.length} failed.`,
  );
  for (const { from, to } of report.noJourney) {
    logger.info(`  no journey: ${from} -> ${to}`);
  }
  for (const { from, to, error } of report.failed) {
    logger.info(`  failed: ${from} -> ${to} (${error}), re-run to retry`);
  }
  if (report.stoppedEarly) {
    logger.error(
      `Stopped after ${MAX_CONSECUTIVE_FAILURES} consecutive failed pair(s); check VBB, then re-run to resume.`,
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await dataSource.initialize();
  let report: FillPostcodeCommuteReport;
  try {
    report = await runFill(dataSource, options, {
      fetchJourneys: (url) => fetchVbbJourneys(url),
      sleep: defaultSleep,
      departure: nextTuesdayDeparture(),
      maxConsecutiveFailures: MAX_CONSECUTIVE_FAILURES,
    });
    printReport(report, options.dryRun);
  } finally {
    await dataSource.destroy();
  }
  if (report.failed.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
