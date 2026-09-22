import "reflect-metadata";
import { DataSource, EntityManager, In } from "typeorm";
import logger from "../../logger";
import { createAddress } from "../../server/utils/data/for-routes";
import { dataSource } from "../data-source";
import Address from "../entity/location/address.entity";
import Person from "../entity/person.entity";
import VolunteerAuditLog from "../entity/volunteer/volunteer-audit-log.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";

// One-off backfill for be#1019/be#1028: before the seeding/write-path fixes
// in be#1025/be#1026, many Person rows could end up sharing one Address row
// (the seeded "Dummy" placeholder, or a per-postcode placeholder reused
// across an entire bulk import). This gives every affected Person but one a
// fresh, exclusively-owned Address, without ever deleting or mutating the
// original row.
//
// Usage: yarn dedupe-shared-address [--apply] [--address-ids 1,2,3]
//   (no flags)    dry run — prints the plan, writes nothing.
//   --apply       performs the writes, in one transaction.
//   --address-ids restrict to specific shared Address ids (comma-separated),
//                 e.g. to apply the fix in cautious batches rather than all
//                 shared rows in prod at once. Omit to process every shared
//                 Address row.

export interface DedupeSharedAddressOptions {
  apply: boolean;
  addressIds?: number[];
}

export function parseArgs(argv: string[]): DedupeSharedAddressOptions {
  const flagIndex = argv.indexOf("--address-ids");
  let addressIds: number[] | undefined;

  if (flagIndex !== -1) {
    const raw = argv[flagIndex + 1];
    // A missing/flag-shaped value here (trailing flag, typo eating the
    // value) must not silently fall back to "no filter" — that would run
    // --apply against every shared row in prod instead of the cautious
    // batch the operator asked for (be#1028/#1032 review).
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
  // Persons this group planned to repoint, but whose addressId had already
  // changed away from the shared row by the time --apply tried to write —
  // e.g. the live app repointed them in between the initial scan and this
  // write. Left untouched rather than overwritten; surfaced for re-run/review.
  staleAddressPersonIds: number[];
}

export interface DedupeReport {
  groups: DedupeGroupResult[];
  // Non-blank groups where no keeper could be identified: the real data in
  // that Address row isn't confidently anyone's any more, and it's now (or
  // would be, in a dry run) fully orphaned rather than guessed at — surfaced
  // here for manual review/attribution.
  needsManualAttribution: DedupeGroupResult[];
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

// Best-guess signal for "who does this Address's current data actually
// belong to": the most recent contact_details_changed entry among the
// affected Persons' Volunteers. Not proof — the audit log stores a generic
// description, not field-level before/after values — and agent contacts
// (no Volunteer) have no signal at all.
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
    // id DESC as a tiebreaker: bulk-imported/same-request audit rows can tie
    // on occurredAt, and without a deterministic secondary key a re-run
    // (--apply after a reviewed dry-run) could silently pick a different
    // keeper than the one reported (be#1032 review).
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
  const blank = !address.street || address.street.trim() === "";

  let keeperPersonId: number | null = null;
  let keeperReason: string | null = null;
  if (!blank) {
    const signal = await findKeeperSignal(manager, personIds);
    if (signal) {
      // Re-check at write time: only trust this signal if the keeper still
      // actually points at the shared Address being processed. If they've
      // already moved off it (e.g. repointed by the live app in the window
      // since the initial scan), nobody currently owns this row's real
      // data — leave keeperPersonId null so it correctly surfaces in
      // needsManualAttribution below instead of being silently excluded
      // from that list (be#1032 review).
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
      // Re-check at write time: only repoint if this Person still points at
      // the shared Address the initial scan found them on. Guards against a
      // race with the live app (or an overlapping --address-ids run) moving
      // them off it in between that scan and this write.
      const updateResult = await manager
        .getRepository(Person)
        .update({ id: personId, addressId }, { addressId: created.id });
      if (updateResult.affected === 1) {
        repointedPersonIds.push(personId);
      } else {
        staleAddressPersonIds.push(personId);
        // The repoint didn't happen, so this replacement was never linked
        // to anyone — clean it up rather than leaving a permanently
        // orphaned, untracked Address row behind (be#1032 review).
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

  // Each group gets its own transaction rather than one transaction for the
  // whole run: a failure partway through a large prod run (e.g. a
  // concurrently-deleted Address) would otherwise roll back every
  // already-processed, correctly-guarded group alongside it, forcing a full
  // re-run through the same race window (be#1032 review). --address-ids
  // still lets an operator scope a run to a smaller batch on top of this.
  const results: DedupeGroupResult[] = [];
  for (const group of groups) {
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
  }

  const needsManualAttribution = results.filter(
    (group) => !group.blank && group.keeperPersonId === null,
  );

  return { groups: results, needsManualAttribution };
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
}

async function main() {
  const { apply, addressIds } = parseArgs(process.argv.slice(2));

  await dataSource.initialize();
  try {
    const report = await runDedupe(dataSource, { apply, addressIds });
    printReport(report, apply);
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
