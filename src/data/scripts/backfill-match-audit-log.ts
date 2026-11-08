import "reflect-metadata";
import { DataSource, EntityManager, LessThan } from "typeorm";
import logger from "../../logger";
import { dataSource } from "../data-source";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";
import { matchDetail } from "../utils/log-match-change";

export interface BackfillMatchAuditLogOptions {
  apply: boolean;
  importedOn: string[];
}

export interface PlannedEntry {
  opportunityVolunteerId: number;
  volunteerId: number;
  detail: string;
  occurredAt: Date;
}

export interface BackfillPlan {
  planned: PlannedEntry[];
  matchesCreatedOn: Record<string, number>;
}

export interface BackfillMatchAuditLogReport extends BackfillPlan {
  cutoff: Date;
  written: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const utcDay = (date: Date) => date.toISOString().slice(0, 10);

export function parseArgs(argv: string[]): BackfillMatchAuditLogOptions {
  const flagIndex = argv.indexOf("--imported-on");
  let importedOn: string[] = [];

  if (flagIndex !== -1) {
    const raw = argv[flagIndex + 1];
    if (!raw || raw.startsWith("--")) {
      throw new Error(
        "--imported-on requires a comma-separated list of dates, e.g. --imported-on 2026-01-28,2026-05-27",
      );
    }
    importedOn = raw.split(",");
    const invalid = importedOn.filter(
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
  }

  return { apply: argv.includes("--apply"), importedOn };
}

export async function findCutoff(manager: EntityManager): Promise<Date> {
  // By id, not occurredAt: backfilled entries are back-dated and would move the cutoff on re-runs.
  const firstLogged = await manager.findOne(VolunteerAuditLog, {
    select: { id: true, occurredAt: true },
    where: { type: "opportunity_status_changed" },
    order: { id: "ASC" },
  });
  return firstLogged?.occurredAt ?? new Date();
}

export function planMatchEntries(
  match: OpportunityVolunteer,
  cutoff: Date,
  importedOn: string[],
): PlannedEntry[] {
  const { id, volunteerId, opportunityId, status, createdAt, updatedAt } =
    match;
  const title = match.opportunity?.title ?? `#${opportunityId}`;
  const changedLater = updatedAt.getTime() > createdAt.getTime();
  const entry = (detail: string, occurredAt: Date): PlannedEntry => ({
    opportunityVolunteerId: id,
    volunteerId,
    detail,
    occurredAt,
  });

  const planned = [
    entry(
      matchDetail.linked(
        title,
        changedLater ? undefined : status,
        importedOn.includes(utcDay(createdAt)),
      ),
      createdAt,
    ),
  ];
  if (changedLater && updatedAt.getTime() < cutoff.getTime()) {
    planned.push(entry(matchDetail.statusChanged(title, status), updatedAt));
  }
  return planned;
}

export async function planEntries(
  manager: EntityManager,
  { importedOn }: BackfillMatchAuditLogOptions,
  cutoff: Date,
): Promise<BackfillPlan> {
  const matches = await manager.find(OpportunityVolunteer, {
    select: {
      id: true,
      volunteerId: true,
      opportunityId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      opportunity: { id: true, title: true },
    },
    relations: { opportunity: true },
    where: { createdAt: LessThan(cutoff) },
    order: { createdAt: "ASC", id: "ASC" },
  });
  const matchesCreatedOn: Record<string, number> = {};
  for (const { createdAt } of matches) {
    const day = utcDay(createdAt);
    matchesCreatedOn[day] = (matchesCreatedOn[day] ?? 0) + 1;
  }
  return {
    planned: matches.flatMap((match) =>
      planMatchEntries(match, cutoff, importedOn),
    ),
    matchesCreatedOn,
  };
}

async function writeEntries(
  manager: EntityManager,
  planned: PlannedEntry[],
): Promise<number> {
  if (!planned.length) {
    return 0;
  }
  await manager.save(
    VolunteerAuditLog,
    planned.map(
      ({ volunteerId, detail, occurredAt }) =>
        new VolunteerAuditLog({
          volunteerId,
          type: "opportunity_status_changed",
          detail,
          occurredAt,
        }),
    ),
  );
  return planned.length;
}

export async function runBackfill(
  ds: DataSource,
  options: BackfillMatchAuditLogOptions,
): Promise<BackfillMatchAuditLogReport> {
  if (!options.apply) {
    const cutoff = await findCutoff(ds.manager);
    return {
      cutoff,
      ...(await planEntries(ds.manager, options, cutoff)),
      written: 0,
    };
  }
  return ds.transaction(async (manager) => {
    const cutoff = await findCutoff(manager);
    const plan = await planEntries(manager, options, cutoff);
    return {
      cutoff,
      ...plan,
      written: await writeEntries(manager, plan.planned),
    };
  });
}

function printReport(
  report: BackfillMatchAuditLogReport,
  apply: boolean,
): void {
  logger.info(
    `Cutoff (first logged match step): ${report.cutoff.toISOString()}.`,
  );
  logger.info("Pre-cutoff matches per created_at day (UTC):");
  for (const [day, count] of Object.entries(report.matchesCreatedOn)) {
    logger.info(`  ${day}: ${count}`);
  }
  logger.info(
    `${apply ? "Wrote" : "[dry-run] Would write"} ${
      apply ? report.written : report.planned.length
    } volunteer activity-log entries.`,
  );
  for (const entry of report.planned) {
    logger.info(
      `  volunteer ${entry.volunteerId} (match ${entry.opportunityVolunteerId}) ` +
        `@ ${entry.occurredAt.toISOString()}: ${entry.detail}`,
    );
  }
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
