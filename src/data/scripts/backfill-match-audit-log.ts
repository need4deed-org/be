import "reflect-metadata";
import { OpportunityVolunteerStatusType } from "need4deed-sdk";
import { DataSource, EntityManager, LessThan } from "typeorm";
import logger from "../../logger";
import { dataSource } from "../data-source";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";
import { matchDetail } from "../utils/log-match-change";

export interface BackfillMatchAuditLogOptions {
  apply: boolean;
  importedOn: string[];
  cutoff?: Date;
}

export interface MatchRow {
  id: number;
  volunteerId: number;
  opportunityId: number;
  title: string | null;
  status: OpportunityVolunteerStatusType;
  createdAt: Date;
  updatedAt: Date;
  createdOn: string;
}

export interface PlannedEntry {
  volunteerId: number;
  kind: "linked" | "status-changed";
  imported: boolean;
  detail: string;
  occurredAt: Date;
}

export interface BackfillPlan {
  planned: PlannedEntry[];
  skippedAlreadyLinked: number;
  matchesCreatedOn: Record<string, number>;
}

export interface BackfillMatchAuditLogReport extends BackfillPlan {
  cutoff: Date;
  cutoffFrom: "--cutoff" | "first logged match step";
  loggedSince: Date;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const ISO_TIMESTAMP_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/;

const CUTOFF_MARGIN_MS = 5_000;

const WRITE_CHUNK = 500;

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

function parseImportedOn(raw: string): string[] {
  const days = raw.split(",");
  const invalid = days.filter(
    (day) =>
      !ISO_DATE.test(day) ||
      Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ||
      utcDay(new Date(`${day}T00:00:00Z`)) !== day,
  );
  if (invalid.length) {
    throw new Error(
      `--imported-on must be YYYY-MM-DD dates, got "${invalid.join(", ")}"`,
    );
  }
  return days;
}

function parseCutoff(raw: string): Date {
  if (!ISO_TIMESTAMP_WITH_ZONE.test(raw) || Number.isNaN(Date.parse(raw))) {
    throw new Error(
      `--cutoff must be an ISO timestamp with a zone, got "${raw}"`,
    );
  }
  return new Date(raw);
}

const VALUE_EXAMPLES: Record<string, string> = {
  "--imported-on":
    "a comma-separated list of dates, e.g. --imported-on 2026-01-28,2026-05-27",
  "--cutoff": "an ISO timestamp, e.g. --cutoff 2026-10-07T09:00:00Z",
};

export function parseArgs(argv: string[]): BackfillMatchAuditLogOptions {
  const options: BackfillMatchAuditLogOptions = {
    apply: false,
    importedOn: [],
  };
  const unknown: string[] = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }
    if (!Object.hasOwn(VALUE_EXAMPLES, arg)) {
      unknown.push(arg);
      continue;
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires ${VALUE_EXAMPLES[arg]}`);
    }
    if (arg === "--imported-on") {
      options.importedOn = parseImportedOn(value);
    } else {
      options.cutoff = parseCutoff(value);
    }
  }

  if (unknown.length) {
    throw new Error(`Unknown argument(s): ${unknown.join(" ")}`);
  }
  return options;
}

export async function findCutoff(manager: EntityManager): Promise<Date> {
  // By id, not occurredAt: backfilled entries are back-dated and would move the cutoff on re-runs.
  const firstLogged = await manager.findOne(VolunteerAuditLog, {
    select: { id: true, occurredAt: true },
    where: { type: "opportunity_status_changed" },
    order: { id: "ASC" },
  });
  if (!firstLogged) {
    throw new Error(
      "No match step has been logged yet, so there is no cutoff; nothing to backfill.",
    );
  }
  return firstLogged.occurredAt;
}

const matchTitle = ({ title, opportunityId }: MatchRow) =>
  matchDetail.title(title, opportunityId);

export function planMatchEntries(
  match: MatchRow,
  loggedSince: Date,
  importedOn: string[],
): PlannedEntry[] {
  const { volunteerId, status, createdAt, updatedAt, createdOn } = match;
  const title = matchTitle(match);
  const changedLater = updatedAt.getTime() > createdAt.getTime();
  const imported = importedOn.includes(createdOn);
  const entry = (
    kind: PlannedEntry["kind"],
    detail: string,
    occurredAt: Date,
  ): PlannedEntry => ({
    volunteerId,
    kind,
    imported: kind === "linked" && imported,
    detail,
    occurredAt,
  });

  const planned = [
    entry(
      "linked",
      matchDetail.linked(title, changedLater ? undefined : status, imported),
      createdAt,
    ),
  ];
  if (changedLater && updatedAt.getTime() < loggedSince.getTime()) {
    planned.push(
      entry(
        "status-changed",
        matchDetail.statusChanged(title, { to: status }),
        updatedAt,
      ),
    );
  }
  return planned;
}

const backfilledKey = (volunteerId: number, occurredAt: Date) =>
  `${volunteerId}@${occurredAt.getTime()}`;

async function findBackfilledLinks(
  manager: EntityManager,
  loggedSince: Date,
): Promise<Map<string, string[]>> {
  const entries = await manager.find(VolunteerAuditLog, {
    select: { id: true, volunteerId: true, detail: true, occurredAt: true },
    where: {
      type: "opportunity_status_changed",
      occurredAt: LessThan(loggedSince),
    },
  });
  const byKey = new Map<string, string[]>();
  for (const { volunteerId, occurredAt, detail } of entries) {
    const key = backfilledKey(volunteerId, occurredAt);
    const details = byKey.get(key);
    if (details) {
      details.push(detail);
    } else {
      byKey.set(key, [detail]);
    }
  }
  return byKey;
}

export async function planEntries(
  manager: EntityManager,
  { importedOn }: BackfillMatchAuditLogOptions,
  loggedSince: Date,
): Promise<BackfillPlan> {
  const matches = await manager
    .createQueryBuilder(OpportunityVolunteer, "ov")
    .leftJoin("ov.opportunity", "o")
    .select("ov.id", "id")
    .addSelect("ov.volunteer_id", "volunteerId")
    .addSelect("ov.opportunity_id", "opportunityId")
    .addSelect("o.title", "title")
    .addSelect("ov.status", "status")
    .addSelect("ov.created_at", "createdAt")
    .addSelect("ov.updated_at", "updatedAt")
    .addSelect("to_char(ov.created_at, 'YYYY-MM-DD')", "createdOn")
    .where("ov.created_at < :loggedSince", { loggedSince })
    .orderBy("ov.created_at", "ASC")
    .addOrderBy("ov.id", "ASC")
    .getRawMany<MatchRow>();

  const backfilledLinks = await findBackfilledLinks(manager, loggedSince);
  const isBackfilled = (match: MatchRow) => {
    const prefix = matchDetail.linkedPrefix(matchTitle(match));
    return (
      backfilledLinks.get(backfilledKey(match.volunteerId, match.createdAt)) ??
      []
    ).some((detail) => detail.startsWith(prefix));
  };
  const toBackfill = matches.filter((match) => !isBackfilled(match));

  const matchesCreatedOn: Record<string, number> = {};
  for (const { createdOn } of matches) {
    matchesCreatedOn[createdOn] = (matchesCreatedOn[createdOn] ?? 0) + 1;
  }
  return {
    planned: toBackfill.flatMap((match) =>
      planMatchEntries(match, loggedSince, importedOn),
    ),
    skippedAlreadyLinked: matches.length - toBackfill.length,
    matchesCreatedOn,
  };
}

async function writeEntries(
  manager: EntityManager,
  planned: PlannedEntry[],
): Promise<void> {
  for (let start = 0; start < planned.length; start += WRITE_CHUNK) {
    await manager.insert(
      VolunteerAuditLog,
      planned
        .slice(start, start + WRITE_CHUNK)
        .map(({ volunteerId, detail, occurredAt }) => ({
          volunteerId,
          type: "opportunity_status_changed" as const,
          detail,
          occurredAt,
        })),
    );
  }
}

export async function backfill(
  manager: EntityManager,
  options: BackfillMatchAuditLogOptions,
): Promise<BackfillMatchAuditLogReport> {
  const cutoff = options.cutoff ?? (await findCutoff(manager));
  // Matches written in the same transaction as the first logged step carry a DB timestamp slightly before it.
  const loggedSince = new Date(cutoff.getTime() - CUTOFF_MARGIN_MS);
  const plan = await planEntries(manager, options, loggedSince);
  if (options.apply) {
    await writeEntries(manager, plan.planned);
  }
  return {
    cutoff,
    cutoffFrom: options.cutoff ? "--cutoff" : "first logged match step",
    loggedSince,
    ...plan,
  };
}

export function runBackfill(
  ds: DataSource,
  options: BackfillMatchAuditLogOptions,
): Promise<BackfillMatchAuditLogReport> {
  return options.apply
    ? ds.transaction((manager) => backfill(manager, options))
    : backfill(ds.manager, options);
}

function printReport(
  report: BackfillMatchAuditLogReport,
  apply: boolean,
): void {
  const count = (keep: (entry: PlannedEntry) => boolean) =>
    report.planned.filter(keep).length;
  logger.info(
    `Cutoff (${report.cutoffFrom}): ${report.cutoff.toISOString()}; ` +
      `backfilling matches before ${report.loggedSince.toISOString()}.`,
  );
  logger.info("Pre-cutoff matches per created_at day (DB time):");
  for (const [day, matches] of Object.entries(report.matchesCreatedOn)) {
    logger.info(`  ${day}: ${matches}`);
  }
  logger.info(
    `Skipped ${report.skippedAlreadyLinked} match(es) already backfilled.`,
  );
  logger.info(
    `${apply ? "Wrote" : "[dry-run] Would write"} ${
      report.planned.length
    } volunteer activity-log entries: ` +
      `${count(({ kind }) => kind === "linked")} Linked ` +
      `(${count(({ imported }) => imported)} imported), ` +
      `${count(({ kind }) => kind === "status-changed")} status changed.`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await dataSource.initialize();
  try {
    printReport(await runBackfill(dataSource, options), options.apply);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
