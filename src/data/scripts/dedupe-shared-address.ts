import "reflect-metadata";
import { DataSource, EntityManager, In } from "typeorm";
import logger from "../../logger";
import { createAddress } from "../../server/utils/data/for-routes";
import { dataSource } from "../data-source";
import Address from "../entity/location/address.entity";
import Person from "../entity/person.entity";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";

export interface DedupeSharedAddressOptions {
  apply: boolean;
  addressIds?: number[];
}

export function parseArgs(argv: string[]): DedupeSharedAddressOptions {
  const flagIndex = argv.indexOf("--address-ids");
  let addressIds: number[] | undefined;

  if (flagIndex !== -1) {
    const raw = argv[flagIndex + 1];
    if (!raw || raw.startsWith("--")) {
      throw new Error(
        "--address-ids requires a comma-separated list of ids, e.g. --address-ids 1,2,3",
      );
    }
    addressIds = raw.split(",").map(Number);
    if (addressIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new Error(
        `--address-ids must be a comma-separated list of positive integers, got "${raw}"`,
      );
    }
  }

  return { apply: argv.includes("--apply"), addressIds };
}

export interface DedupeGroupResult {
  addressId: number;
  postcodeId: number;
  blank: boolean;
  affectedPersonIds: number[];
  keeperPersonId: number | null;
  keeperReason: string | null;
  repointedPersonIds: number[];
  staleAddressPersonIds: number[];
}

export interface DedupeReport {
  groups: DedupeGroupResult[];
  needsManualAttribution: DedupeGroupResult[];
  erroredGroups: { addressId: number; error: string }[];
}

async function findSharedAddressGroups(
  ds: DataSource,
  addressIds?: number[],
): Promise<{ addressId: number; personIds: number[] }[]> {
  const query = ds
    .getRepository(Person)
    .createQueryBuilder("person")
    .select("person.addressId", "addressId")
    .addSelect("array_agg(person.id ORDER BY person.id)", "personIds")
    .where("person.addressId IS NOT NULL");

  if (addressIds?.length) {
    query.andWhere("person.addressId IN (:...addressIds)", { addressIds });
  }

  const rows = await query
    .groupBy("person.addressId")
    .having("COUNT(*) > 1")
    .orderBy("person.addressId", "ASC")
    .getRawMany<{ addressId: string; personIds: number[] }>();

  return rows.map((row) => ({
    addressId: Number(row.addressId),
    personIds: row.personIds,
  }));
}

async function findKeeperSignal(
  manager: EntityManager,
  personIds: number[],
): Promise<{ personId: number; reason: string } | null> {
  const volunteers = await manager
    .getRepository(Volunteer)
    .find({ where: { personId: In(personIds) } });
  if (!volunteers.length) {
    return null;
  }

  const latest = await manager.getRepository(VolunteerAuditLog).findOne({
    where: {
      volunteerId: In(volunteers.map((v) => v.id)),
      type: "contact_details_changed",
    },
    order: { occurredAt: "DESC", id: "DESC" },
  });
  if (!latest) {
    return null;
  }

  const owner = volunteers.find((v) => v.id === latest.volunteerId);
  if (!owner) {
    return null;
  }

  return {
    personId: owner.personId,
    reason:
      `most recent contact_details_changed audit entry ` +
      `(volunteerId=${latest.volunteerId}, occurredAt=${latest.occurredAt.toISOString()})`,
  };
}

export async function processGroup(
  manager: EntityManager,
  addressId: number,
  personIds: number[],
  apply: boolean,
): Promise<DedupeGroupResult> {
  const address = await manager
    .getRepository(Address)
    .findOneByOrFail({ id: addressId });
  const isBlankField = (value: string | null | undefined) =>
    !value || value.trim() === "";
  const blank = isBlankField(address.street) && isBlankField(address.city);

  let keeperPersonId: number | null = null;
  let keeperReason: string | null = null;
  if (!blank) {
    const signal = await findKeeperSignal(manager, personIds);
    if (signal) {
      const keeperPerson = await manager
        .getRepository(Person)
        .findOneBy({ id: signal.personId });
      if (keeperPerson?.addressId === addressId) {
        keeperPersonId = signal.personId;
        keeperReason = signal.reason;
      }
    }
  }

  const candidatePersonIds = personIds.filter((id) => id !== keeperPersonId);
  const repointedPersonIds: number[] = [];
  const staleAddressPersonIds: number[] = [];

  if (apply) {
    for (const personId of candidatePersonIds) {
      const created = await createAddress(
        {},
        { id: address.postcodeId },
        manager,
      );
      if (!created) {
        throw new Error(
          `Failed to create a replacement Address for Person ${personId} ` +
            `(postcodeId=${address.postcodeId}).`,
        );
      }
      const updateResult = await manager
        .getRepository(Person)
        .update({ id: personId, addressId }, { addressId: created.id });
      if (updateResult.affected === 1) {
        repointedPersonIds.push(personId);
      } else {
        staleAddressPersonIds.push(personId);
        await manager.getRepository(Address).delete({ id: created.id });
      }
    }
  } else {
    repointedPersonIds.push(...candidatePersonIds);
  }

  return {
    addressId,
    postcodeId: address.postcodeId,
    blank,
    affectedPersonIds: personIds,
    keeperPersonId,
    keeperReason,
    repointedPersonIds,
    staleAddressPersonIds,
  };
}

export async function runDedupe(
  ds: DataSource,
  { apply, addressIds }: DedupeSharedAddressOptions,
): Promise<DedupeReport> {
  const groups = await findSharedAddressGroups(ds, addressIds);

  const results: DedupeGroupResult[] = [];
  const erroredGroups: { addressId: number; error: string }[] = [];
  for (const group of groups) {
    try {
      results.push(
        apply
          ? await ds.transaction((manager) =>
              processGroup(manager, group.addressId, group.personIds, apply),
            )
          : await processGroup(
              ds.manager,
              group.addressId,
              group.personIds,
              apply,
            ),
      );
    } catch (err) {
      erroredGroups.push({
        addressId: group.addressId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const needsManualAttribution = results.filter(
    (group) => !group.blank && group.keeperPersonId === null,
  );

  return { groups: results, needsManualAttribution, erroredGroups };
}

function printReport(report: DedupeReport, apply: boolean): void {
  logger.info(
    `${apply ? "Applied" : "[dry-run] Would apply"} dedupe across ${
      report.groups.length
    } shared Address group(s).`,
  );
  for (const group of report.groups) {
    logger.info(
      `Address ${group.addressId} (postcode ${group.postcodeId}, ${
        group.blank ? "blank" : "non-blank"
      }): ${group.affectedPersonIds.length} Person(s) [${group.affectedPersonIds.join(", ")}]. ` +
        `Keeper: ${group.keeperPersonId ?? "none"}${
          group.keeperReason ? ` (${group.keeperReason})` : ""
        }. ${apply ? "Repointed" : "Would repoint"}: [${group.repointedPersonIds.join(", ")}].`,
    );
    if (group.staleAddressPersonIds.length) {
      logger.info(
        `  Skipped (address changed before this write could apply — re-run ` +
          `to pick up): [${group.staleAddressPersonIds.join(", ")}].`,
      );
    }
  }

  if (report.needsManualAttribution.length) {
    logger.info(
      "Needs manual attribution — original Address rows with real, " +
        "unattributed data (never deleted, just orphaned from every Person):",
    );
    for (const group of report.needsManualAttribution) {
      logger.info(
        `  Address ${group.addressId} (postcode ${group.postcodeId}) — ` +
          `formerly shared by Person(s) [${group.affectedPersonIds.join(", ")}].`,
      );
    }
  } else {
    logger.info("No rows need manual attribution.");
  }

  if (report.erroredGroups.length) {
    logger.info(
      `${report.erroredGroups.length} group(s) errored and were skipped — re-run to retry them:`,
    );
    for (const { addressId, error } of report.erroredGroups) {
      logger.info(`  Address ${addressId}: ${error}`);
    }
  }
}

async function main() {
  const { apply, addressIds } = parseArgs(process.argv.slice(2));

  await dataSource.initialize();
  let report: DedupeReport;
  try {
    report = await runDedupe(dataSource, { apply, addressIds });
    printReport(report, apply);
  } finally {
    await dataSource.destroy();
  }
  if (report.erroredGroups.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
