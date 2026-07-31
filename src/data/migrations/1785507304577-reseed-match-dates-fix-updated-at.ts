import { MigrationInterface, QueryRunner } from "typeorm";

// Follow-up to RestoreMatchDatesFromNotionCsv1785432386411 (be#814, closing
// #804). That migration correctly restored `created_at` for these 146
// (volunteer, opportunity) pairs from the legacy Notion export, but its
// `UPDATE ... SET created_at = ..., updated_at = now()` simultaneously reset
// `updated_at` to the migration's own run time. The FE reads `updatedAt`
// directly as the "Active since" / "Matched on" / etc. date shown on
// volunteer and opportunity profiles (see be#818), so that "fix" corrupted a
// different user-visible date for the same 146 rows.
//
// This migration:
//   1. Re-applies the same 146 pairs, setting BOTH `created_at` and
//      `updated_at` to the real historical match date (not `now()`), so
//      "Active since" reflects the actual match date instead of migration
//      noise.
//   2. Corrects 9 of those pairs to a more accurate date sourced from a
//      separate, more recently maintained coordinator status/match-tracking
//      sheet, which disagreed with the original Notion export for these
//      specific volunteers (confirmed via name lookup, not nid — see be#818
//      for the full list and reasoning). All other 137 pairs are unchanged
//      from the original Notion export values.
//
// Pairs as [volunteerNid, opportunityNid, matchedDate].
const MATCHED_DATES: [string, string, string][] = [
  ["VOLVO-421", "VOL-116", "2026-03-24"],
  ["VOLVO-301", "VOL-12", "2025-11-04"],
  ["VOLVO-174", "VOL-13", "2025-07-17"],
  ["VOLVO-122", "VOL-142", "2025-04-30"],
  ["VOLVO-493", "VOL-146", "2024-11-14"],
  ["VOLVO-662", "VOL-146", "2024-11-14"],
  ["VOLVO-391", "VOL-16", "2026-02-09"],
  ["VOLVO-805", "VOL-16", "2026-03-30"],
  ["VOLVO-609", "VOL-176", "2024-09-06"],
  ["VOLVO-718", "VOL-192", "2026-04-13"],
  ["VOLVO-735", "VOL-196", "2024-06-05"],
  ["VOLVO-366", "VOL-207", "2025-12-29"],
  ["VOLVO-493", "VOL-207", "2024-11-14"],
  ["VOLVO-662", "VOL-207", "2024-11-14"],
  ["VOLVO-291", "VOL-235", "2026-02-26"],
  ["VOLVO-97", "VOL-235", "2025-04-09"],
  ["VOLVO-712", "VOL-24", "2024-04-04"],
  ["VOLVO-819", "VOL-265", "2026-04-14"],
  ["VOLVO-107", "VOL-266", "2025-09-19"],
  ["VOLVO-428", "VOL-267", "2026-02-26"],
  ["VOLVO-309", "VOL-270", "2025-11-27"],
  ["VOLVO-697", "VOL-271", "2025-10-29"],
  ["VOLVO-37", "VOL-290", "2025-11-12"],
  ["VOLVO-527", "VOL-295", "2025-10-30"],
  ["VOLVO-527", "VOL-296", "2025-10-30"],
  ["VOLVO-25", "VOL-302", "2025-10-23"],
  ["VOLVO-361", "VOL-313", "2025-12-19"],
  ["VOLVO-735", "VOL-329", "2024-06-05"],
  ["VOLVO-373", "VOL-331", "2026-01-12"],
  ["VOLVO-113", "VOL-333", "2025-04-23"],
  ["VOLVO-333", "VOL-337", "2026-01-20"],
  ["VOLVO-272", "VOL-338", "2025-10-03"],
  ["VOLVO-507", "VOL-346", "2024-10-17"],
  ["VOLVO-25", "VOL-348", "2025-10-23"],
  ["VOLVO-81", "VOL-361", "2025-03-24"],
  ["VOLVO-595", "VOL-37", "2024-06-18"],
  ["VOLVO-217", "VOL-374", "2025-08-13"],
  ["VOLVO-266", "VOL-384", "2025-09-24"],
  ["VOLVO-101", "VOL-389", "2025-04-17"],
  ["VOLVO-74", "VOL-392", "2025-03-26"],
  ["VOLVO-149", "VOL-395", "2025-06-03"],
  ["VOLVO-351", "VOL-4", "2025-12-09"],
  ["VOLVO-210", "VOL-410", "2025-08-14"],
  ["VOLVO-94", "VOL-425", "2025-07-15"],
  ["VOLVO-37", "VOL-429", "2025-11-12"],
  ["VOLVO-527", "VOL-439", "2025-10-30"],
  ["VOLVO-297", "VOL-441", "2025-10-16"],
  ["VOLVO-40", "VOL-441", "2025-04-02"],
  ["VOLVO-337", "VOL-445", "2025-11-26"],
  ["VOLVO-549", "VOL-445", "2025-04-28"],
  ["VOLVO-763", "VOL-445", "2025-07-10"],
  ["VOLVO-533", "VOL-446", "2025-10-27"],
  ["VOLVO-21", "VOL-448", "2024-02-06"],
  ["VOLVO-718", "VOL-448", "2026-04-13"],
  ["VOLVO-151", "VOL-451", "2025-06-16"],
  ["VOLVO-697", "VOL-464", "2025-10-29"],
  ["VOLVO-163", "VOL-465", "2025-08-01"],
  ["VOLVO-171", "VOL-465", "2025-07-01"],
  ["VOLVO-173", "VOL-465", "2025-07-01"],
  ["VOLVO-163", "VOL-479", "2025-08-01"],
  ["VOLVO-178", "VOL-479", "2025-07-09"],
  ["VOLVO-67", "VOL-479", "2026-01-12"],
  ["VOLVO-161", "VOL-491", "2025-07-28"],
  ["VOLVO-191", "VOL-496", "2025-07-17"],
  ["VOLVO-238", "VOL-496", "2025-09-24"],
  ["VOLVO-686", "VOL-497", "2024-06-18"],
  ["VOLVO-308", "VOL-506", "2025-11-11"],
  ["VOLVO-234", "VOL-507", "2025-09-01"],
  ["VOLVO-164", "VOL-515", "2025-08-01"],
  ["VOLVO-178", "VOL-515", "2025-07-09"],
  ["VOLVO-205", "VOL-515", "2025-08-01"],
  ["VOLVO-295", "VOL-520", "2025-10-30"],
  ["VOLVO-99", "VOL-523", "2025-04-15"],
  ["VOLVO-386", "VOL-565", "2026-01-15"],
  ["VOLVO-277", "VOL-576", "2025-10-09"],
  ["VOLVO-385", "VOL-586", "2026-01-22"],
  ["VOLVO-683", "VOL-588", "2025-10-21"],
  ["VOLVO-443", "VOL-601", "2026-03-17"],
  ["VOLVO-380", "VOL-612", "2026-01-13"],
  ["VOLVO-378", "VOL-613", "2026-01-08"],
  ["VOLVO-350", "VOL-615", "2026-01-22"],
  ["VOLVO-735", "VOL-616", "2024-06-05"],
  ["VOLVO-409", "VOL-618", "2026-04-01"],
  ["VOLVO-455", "VOL-618", "2026-04-01"],
  ["VOLVO-67", "VOL-631", "2026-01-12"],
  ["VOLVO-806", "VOL-634", "2026-04-13"],
  ["VOLVO-389", "VOL-639", "2026-01-22"],
  ["VOLVO-242", "VOL-649", "2026-01-12"],
  ["VOLVO-178", "VOL-652", "2025-07-09"],
  ["VOLVO-426", "VOL-656", "2026-03-23"],
  ["VOLVO-438", "VOL-656", "2026-03-16"],
  ["VOLVO-129", "VOL-667", "2026-03-09"],
  ["VOLVO-626", "VOL-669", "2025-12-19"],
  ["VOLVO-303", "VOL-671", "2025-12-30"],
  ["VOLVO-354", "VOL-672", "2025-12-10"],
  ["VOLVO-376", "VOL-673", "2026-01-15"],
  ["VOLVO-401", "VOL-673", "2026-02-05"],
  ["VOLVO-417", "VOL-673", "2026-02-05"],
  ["VOLVO-357", "VOL-675", "2025-12-09"],
  ["VOLVO-462", "VOL-680", "2026-03-30"],
  ["VOLVO-214", "VOL-685", "2026-03-04"],
  ["VOLVO-418", "VOL-685", "2026-02-11"],
  ["VOLVO-411", "VOL-690", "2026-02-10"],
  ["VOLVO-521", "VOL-690", "2026-04-01"],
  ["VOLVO-738", "VOL-691", "2026-02-09"],
  ["VOLVO-808", "VOL-691", "2026-03-26"],
  ["VOLVO-369", "VOL-692", "2025-12-24"],
  ["VOLVO-442", "VOL-698", "2026-02-27"],
  ["VOLVO-437", "VOL-706", "2026-03-18"],
  ["VOLVO-283", "VOL-709", "2025-11-11"],
  ["VOLVO-452", "VOL-712", "2026-03-12"],
  ["VOLVO-826", "VOL-712", "2026-04-15"],
  ["VOLVO-387", "VOL-714", "2026-01-21"],
  ["VOLVO-350", "VOL-715", "2026-01-22"],
  ["VOLVO-379", "VOL-715", "2026-01-15"],
  ["VOLVO-429", "VOL-717", "2026-05-07"],
  ["VOLVO-302", "VOL-720", "2026-02-24"],
  ["VOLVO-333", "VOL-720", "2026-01-20"],
  ["VOLVO-302", "VOL-728", "2026-02-24"],
  ["VOLVO-370", "VOL-728", "2026-02-03"],
  ["VOLVO-58", "VOL-728", "2025-01-19"],
  ["VOLVO-394", "VOL-736", "2026-01-27"],
  ["VOLVO-435", "VOL-736", "2026-03-04"],
  ["VOLVO-423", "VOL-748", "2026-02-10"],
  ["VOLVO-434", "VOL-748", "2026-03-06"],
  ["VOLVO-440", "VOL-748", "2026-03-19"],
  ["VOLVO-414", "VOL-749", "2026-02-09"],
  ["VOLVO-400", "VOL-753", "2026-02-26"],
  ["VOLVO-107", "VOL-754", "2025-09-19"],
  ["VOLVO-33", "VOL-754", "2026-03-17"],
  ["VOLVO-430", "VOL-765", "2026-02-17"],
  ["VOLVO-449", "VOL-779", "2026-03-23"],
  ["VOLVO-805", "VOL-779", "2026-03-30"],
  ["VOLVO-291", "VOL-787", "2026-02-26"],
  ["VOLVO-673", "VOL-787", "2026-02-24"],
  ["VOLVO-356", "VOL-797", "2026-03-26"],
  ["VOLVO-325", "VOL-803", "2026-03-16"],
  ["VOLVO-451", "VOL-808", "2026-04-15"],
  ["VOLVO-817", "VOL-808", "2026-04-13"],
  ["VOLVO-325", "VOL-809", "2026-03-16"],
  ["VOLVO-430", "VOL-825", "2026-02-17"],
  ["VOLVO-804", "VOL-826", "2026-04-02"],
  ["VOLVO-447", "VOL-828", "2026-03-26"],
  ["VOLVO-114", "VOL-831", "2025-04-30"],
  ["VOLVO-755", "VOL-841", "2026-03-24"],
  ["VOLVO-377", "VOL-847", "2026-06-08"],
];

export class ReseedMatchDatesFixUpdatedAt1785507304577
  implements MigrationInterface
{
  name = "ReseedMatchDatesFixUpdatedAt1785507304577";

  // Safe to re-run: only ever updates created_at/updated_at, and only when
  // at least one of them differs from the target date.
  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = MATCHED_DATES.map(
      ([volNid, oppNid, matchedDate]) =>
        `('${volNid}', '${oppNid}', '${matchedDate}'::date)`,
    ).join(",\n        ");

    // Surface any pair that doesn't resolve to an existing matched relation
    // — either nid not found, or no matched/active/past opportunity_volunteer
    // row for that pair — instead of letting the JOIN silently drop it.
    const unresolved: { vol_nid: string; opp_nid: string }[] =
      await queryRunner.query(`
      SELECT p.vol_nid, p.opp_nid
      FROM (VALUES ${values}) AS p(vol_nid, opp_nid, matched_date)
      LEFT JOIN volunteer v ON v.nid = p.vol_nid
      LEFT JOIN opportunity o ON o.nid = p.opp_nid
      LEFT JOIN opportunity_volunteer ov
        ON ov.volunteer_id = v.id
        AND ov.opportunity_id = o.id
        AND ov.status IN ('opp-matched', 'opp-active', 'opp-past')
      WHERE v.id IS NULL OR o.id IS NULL OR ov.id IS NULL;
    `);

    if (unresolved.length > 0) {
      console.warn(
        `ReseedMatchDatesFixUpdatedAt: ${unresolved.length} pair(s) did not resolve to an existing matched relation:`,
        unresolved,
      );
    }

    await queryRunner.query(`
      UPDATE opportunity_volunteer
      SET created_at = p.matched_date::timestamp,
          updated_at = p.matched_date::timestamp
      FROM (VALUES ${values}) AS p(vol_nid, opp_nid, matched_date)
      JOIN volunteer v ON v.nid = p.vol_nid
      JOIN opportunity o ON o.nid = p.opp_nid
      WHERE opportunity_volunteer.volunteer_id = v.id
        AND opportunity_volunteer.opportunity_id = o.id
        AND opportunity_volunteer.status IN ('opp-matched', 'opp-active', 'opp-past')
        AND (
          opportunity_volunteer.created_at IS DISTINCT FROM p.matched_date::timestamp
          OR opportunity_volunteer.updated_at IS DISTINCT FROM p.matched_date::timestamp
        );
    `);
  }

  // Data seed correcting a prior data seed — prior per-row created_at/updated_at
  // values are not recorded, so no automatic rollback (same convention as
  // RestoreMatchDatesFromNotionCsv1785432386411's down()).
  public async down(): Promise<void> {}
}
