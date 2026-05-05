import { MigrationInterface, QueryRunner } from "typeorm";

const LEGACY_TO_COMPOUND: Record<string, string> = {
  Kreuzberg: "Friedrichshain-Kreuzberg",
  Friedrichshain: "Friedrichshain-Kreuzberg",
  Charlottenburg: "Charlottenburg-Wilmersdorf",
  Wilmersdorf: "Charlottenburg-Wilmersdorf",
  Zehlendorf: "Steglitz-Zehlendorf",
  Steglitz: "Steglitz-Zehlendorf",
  Tempelhof: "Tempelhof-Schöneberg",
  Schöneberg: "Tempelhof-Schöneberg",
  Treptow: "Treptow-Köpenick",
  Köpenick: "Treptow-Köpenick",
  Marzahn: "Marzahn-Hellersdorf",
  Hellersdorf: "Marzahn-Hellersdorf",
  Moabit: "Mitte",
  Wedding: "Mitte",
  Tiergarten: "Mitte",
  "Prenzlauer Berg": "Pankow",
  Weißensee: "Pankow",
};

export class ConsolidateLegacyDistricts1777973964566
  implements MigrationInterface
{
  name = "ConsolidateLegacyDistricts1777973964566";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [legacy, compound] of Object.entries(LEGACY_TO_COMPOUND)) {
      // Remap location_district rows from the legacy district to the compound one.
      // If the location already has the compound district linked, drop the duplicate instead.
      await queryRunner.query(
        `
        UPDATE location_district ld
        SET district_id = (SELECT id FROM district WHERE title = $1)
        WHERE ld.district_id = (SELECT id FROM district WHERE title = $2)
          AND NOT EXISTS (
            SELECT 1 FROM location_district ld2
            WHERE ld2.location_id = ld.location_id
              AND ld2.district_id = (SELECT id FROM district WHERE title = $1)
          )
        `,
        [compound, legacy],
      );

      // Remove any remaining rows still pointing to the legacy district,
      // but only where the compound district is already linked for that location —
      // guarantees no location is left with zero districts if the remap failed.
      await queryRunner.query(
        `
        DELETE FROM location_district ld
        WHERE ld.district_id = (SELECT id FROM district WHERE title = $1)
          AND EXISTS (
            SELECT 1 FROM location_district ld2
            WHERE ld2.location_id = ld.location_id
              AND ld2.district_id = (SELECT id FROM district WHERE title = $2)
          )
        `,
        [legacy, compound],
      );

      // Delete the legacy district record itself.
      await queryRunner.query(
        `DELETE FROM district WHERE title = $1`,
        [legacy],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-inserting legacy district rows is not meaningful — down() is a no-op.
  }
}
