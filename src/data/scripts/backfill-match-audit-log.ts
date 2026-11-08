import "reflect-metadata";
import { DataSource, EntityManager } from "typeorm";
import logger from "../../logger";
import { dataSource } from "../data-source";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";

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

export interface BackfillMatchAuditLogReport {
  planned: PlannedEntry[];
  written: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
        new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day,
    );
    if (invalid.length) {
      throw new Error(
        `--imported-on must be YYYY-MM-DD dates, got "${invalid.join(", ")}"`,
      );
    }
  }

  return { apply: argv.includes("--apply"), importedOn };
}

export async function planEntries(
  _manager: EntityManager,
  _options: BackfillMatchAuditLogOptions,
): Promise<PlannedEntry[]> {
  return [];
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
    return { planned: await planEntries(ds.manager, options), written: 0 };
  }
  return ds.transaction(async (manager) => {
    const planned = await planEntries(manager, options);
    return { planned, written: await writeEntries(manager, planned) };
  });
}

function printReport(
  report: BackfillMatchAuditLogReport,
  apply: boolean,
): void {
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
