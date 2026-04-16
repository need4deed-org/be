/**
 * Notion → BE data migration script.
 *
 * Migrates four fields for every volunteer found in a Notion CSV export:
 *   1. Engagement status  (Active, Available, Inactive, Unresponsive, …)
 *   2. Opportunity matching  (PENDING → MATCHED / ACTIVE on OpportunityVolunteer)
 *   3. Appreciation records  (T-shirt, Certificate, …)
 *   4. Comments  (coordinator notes + volunteer personal notes)
 *
 * The script is idempotent — safe to run multiple times and for different
 * engagement-status slices (active, inactive, unresponsive, etc.).
 *
 * Usage:
 *   1. Convert the Notion CSV:
 *        python3 scripts/csv-to-json.py <notion-export.csv> migration.json
 *   2. Run this script:
 *        yarn migrate:notion migration.json
 */

import * as fs from "fs";
import "reflect-metadata";
import {
  EntityTableName,
  OpportunityVolunteerStatusType,
  VolunteerStateAppreciationType,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { DataSource } from "typeorm";
import { seedVolunteersFile } from "../../config/constants";
import logger from "../../logger";
import { tryCatch } from "../../services/utils";
import { dataSource } from "../data-source";
import Comment from "../entity/comment.entity";
import OpportunityVolunteer from "../entity/m2m/opportunity-volunteer";
import NotionRelation from "../entity/notion-relation.entity";
import Person from "../entity/person.entity";
import Language from "../entity/profile/language.entity";
import User from "../entity/user.entity";
import Appreciation from "../entity/volunteer/appreciation.entity";
import Volunteer from "../entity/volunteer/volunteer.entity";
import { fetchJsonFromUrl, getRepository } from "../utils";
import { updateVolunteerMatching } from "../utils/update-volunteer-matching";
import { VolunteerJSON } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MigrationEntry {
  notionId: string;
  status: string;
  appreciation: string;
  cgc: string;
  coordinatorComments: string;
  volunteerComments: string;
  activeOpportunityIds: string[];
  contactedOpportunityIds: string[];
  matchedOpportunityIds: string[];
}

// ---------------------------------------------------------------------------
// Status mapping — covers all Notion engagement status values
// ---------------------------------------------------------------------------

const ENGAGEMENT_MAP: Record<string, VolunteerStateEngagementType> = {
  Active: VolunteerStateEngagementType.ACTIVE,
  Available: VolunteerStateEngagementType.AVAILABLE,
  Inactive: VolunteerStateEngagementType.INACTIVE,
  New: VolunteerStateEngagementType.NEW,
  "Temp Unavailable": VolunteerStateEngagementType.TEMP_UNAVAILABLE,
  Unresponsive: VolunteerStateEngagementType.UNRESPONSIVE,
};

// ---------------------------------------------------------------------------
// Appreciation mapping
// ---------------------------------------------------------------------------

function parseAppreciation(
  raw: string,
): { title: VolunteerStateAppreciationType; delivered: boolean }[] {
  const result: { title: VolunteerStateAppreciationType; delivered: boolean }[] =
    [];
  for (const part of raw.split(",").map((p) => p.trim())) {
    if (part === "T-shirt") {
      result.push({
        title: VolunteerStateAppreciationType.T_SHIRT,
        delivered: true,
      });
    } else if (part === "T-shirt offered") {
      result.push({
        title: VolunteerStateAppreciationType.T_SHIRT,
        delivered: false,
      });
    } else if (part === "Certificate") {
      result.push({
        title: VolunteerStateAppreciationType.BENEFIT_CARD,
        delivered: true,
      });
    }
    // MTV Video, EA - Recommended, FWP - Recommended: no enum equivalent, skip
  }
  return result;
}

// ---------------------------------------------------------------------------
// Step 1 — backfill notionId for volunteers not covered by the schema migration
// ---------------------------------------------------------------------------

async function backfillNotionIds(ds: DataSource): Promise<number> {
  const volunteersJson = (await fetchJsonFromUrl(
    seedVolunteersFile,
  )) as VolunteerJSON[];

  const personRepo = getRepository(ds, Person);
  const volunteerRepo = getRepository(ds, Volunteer);
  let count = 0;

  for (const v of volunteersJson ?? []) {
    if (!v.nid || !v.person?.email) continue;

    const person = await personRepo.findOne({
      where: { email: v.person.email },
    });
    if (!person) continue;

    const volunteer = await volunteerRepo.findOne({
      where: { personId: person.id },
    });
    if (!volunteer || volunteer.notionId) continue;

    volunteer.notionId = v.nid;
    await volunteerRepo.save(volunteer);
    count++;
  }

  return count;
}

// ---------------------------------------------------------------------------
// Step 2 — process each CSV entry
// ---------------------------------------------------------------------------

async function procesEntries(
  ds: DataSource,
  entries: MigrationEntry[],
): Promise<void> {
  const volunteerRepo = getRepository(ds, Volunteer);
  const commentRepo = getRepository(ds, Comment);
  const appreciationRepo = getRepository(ds, Appreciation);
  const oppVolRepo = getRepository(ds, OpportunityVolunteer);
  const notionRelRepo = getRepository(ds, NotionRelation);
  const userRepo = getRepository(ds, User);
  const langRepo = getRepository(ds, Language);

  // Use admin user as author for migrated comments / appreciation records
  const systemUser = await userRepo.findOne({
    where: { email: "john.doe@need4deed.org" },
  });
  const englishLang = await langRepo.findOne({ where: { title: "English" } });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of entries) {
    const [, err] = await tryCatch(processOne(entry));
    if (err) {
      logger.error(
        `Error processing ${entry.notionId}: ${(err as Error).message}`,
      );
      errors++;
    }
  }

  logger.info(
    `Migration complete — updated: ${updated}, skipped: ${skipped}, errors: ${errors}`,
  );

  // -------------------------------------------------------------------------
  async function processOne(entry: MigrationEntry): Promise<void> {
    if (!entry.notionId) {
      skipped++;
      return;
    }

    const volunteer = await volunteerRepo.findOne({
      where: { notionId: entry.notionId },
    });
    if (!volunteer) {
      logger.warn(`Volunteer not found: ${entry.notionId} — skipping`);
      skipped++;
      return;
    }

    // 1. Engagement status — always write the CSV value so re-runs stay fresh
    const engStatus = ENGAGEMENT_MAP[entry.status];
    if (engStatus) {
      volunteer.statusEngagement = engStatus;
      await volunteerRepo.save(volunteer);
    }

    // 2. Coordinator comments (idempotent — skip if text already exists)
    if (entry.coordinatorComments) {
      const exists = await commentRepo.findOne({
        where: {
          entityType: EntityTableName.VOLUNTEER,
          entityId: volunteer.id,
          text: entry.coordinatorComments,
        },
      });
      if (!exists) {
        await commentRepo.save(
          new Comment({
            text: entry.coordinatorComments,
            entityType: EntityTableName.VOLUNTEER,
            entityId: volunteer.id,
            userId: systemUser?.id,
            languageId: englishLang?.id,
          }),
        );
      }
    }

    // 3. Volunteer personal comments (idempotent)
    if (entry.volunteerComments) {
      const exists = await commentRepo.findOne({
        where: {
          entityType: EntityTableName.VOLUNTEER,
          entityId: volunteer.id,
          text: entry.volunteerComments,
        },
      });
      if (!exists) {
        await commentRepo.save(
          new Comment({
            text: entry.volunteerComments,
            entityType: EntityTableName.VOLUNTEER,
            entityId: volunteer.id,
            userId: systemUser?.id,
            languageId: englishLang?.id,
          }),
        );
      }
    }

    // 4. Appreciation records (idempotent — one record per title per volunteer)
    for (const { title, delivered } of parseAppreciation(entry.appreciation)) {
      const exists = await appreciationRepo.findOne({
        where: { volunteerId: volunteer.id, title },
      });
      if (!exists) {
        await appreciationRepo.save(
          new Appreciation({
            title,
            volunteerId: volunteer.id,
            userId: systemUser?.id,
            dateDelivery: delivered ? new Date() : null,
          }),
        );
      }
    }

    // 5. OpportunityVolunteer statuses
    //    Notion "active" opportunities  → ACTIVE  (only upgrade from PENDING)
    //    Notion "matched" opportunities → MATCHED (only upgrade from PENDING)
    //    volunteer.statusMatch is then recomputed automatically by
    //    updateVolunteerMatching, keeping it opportunity-driven as the BE expects.

    let oppStatusChanged = false;

    for (const oppNid of entry.activeOpportunityIds) {
      if (await upgradeOppVolStatus(oppNid, volunteer.id, OpportunityVolunteerStatusType.ACTIVE)) {
        oppStatusChanged = true;
      }
    }

    for (const oppNid of entry.matchedOpportunityIds) {
      if (await upgradeOppVolStatus(oppNid, volunteer.id, OpportunityVolunteerStatusType.MATCHED)) {
        oppStatusChanged = true;
      }
    }

    if (oppStatusChanged) {
      await updateVolunteerMatching(volunteer.id);
    }

    updated++;
  }

  // -------------------------------------------------------------------------
  // Helper: look up the opportunity by its Notion ID, then upgrade the
  // OpportunityVolunteer row only if it is currently PENDING.
  // Returns true when a change was made.
  // -------------------------------------------------------------------------
  async function upgradeOppVolStatus(
    oppNotionId: string,
    volunteerId: number,
    targetStatus: OpportunityVolunteerStatusType,
  ): Promise<boolean> {
    const notionRel = await notionRelRepo.findOne({
      where: {
        hostNid: oppNotionId,
        hostType: EntityTableName.OPPORTUNITY,
      },
    });
    if (!notionRel) return false;

    const ov = await oppVolRepo.findOne({
      where: { volunteerId, opportunityId: notionRel.hostId },
    });
    if (!ov || ov.status !== OpportunityVolunteerStatusType.PENDING) return false;

    ov.status = targetStatus;
    await oppVolRepo.save(ov);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error(
      "Usage: yarn migrate:notion <path-or-url-to-migration-json>\n" +
        "  Generate the JSON first with: python3 scripts/csv-to-json.py <csv> <json>",
    );
    process.exit(1);
  }

  const isUrl = jsonPath.startsWith("http://") || jsonPath.startsWith("https://");

  if (!isUrl && !fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  await dataSource.initialize();

  // Step 1: ensure every volunteer has a notionId
  logger.info("Step 1: backfilling notionId from seed JSON…");
  const backfilled = await backfillNotionIds(dataSource);
  logger.info(`  → ${backfilled} volunteer(s) backfilled`);

  // Step 2: apply CSV data
  let entries: MigrationEntry[];
  if (isUrl) {
    logger.info(`Fetching migration data from URL: ${jsonPath}`);
    entries = (await fetchJsonFromUrl(jsonPath)) as MigrationEntry[];
  } else {
    entries = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  }
  logger.info(`Step 2: processing ${entries.length} entries from ${jsonPath}…`);
  await procesEntries(dataSource, entries);

  await dataSource.destroy();
}

main().catch((err) => {
  logger.error("Migration failed:", err);
  process.exit(1);
});

