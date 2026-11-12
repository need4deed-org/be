import { MigrationInterface, QueryRunner } from "typeorm";

export class DedupePostcodeValue1794475547976 implements MigrationInterface {
  name = "DedupePostcodeValue1794475547976";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMP TABLE postcode_dupe ON COMMIT DROP AS
      SELECT p.id AS dupe_id, k.keep_id
        FROM postcode p
        JOIN (
          SELECT value, min(id) AS keep_id
            FROM postcode
           GROUP BY value
          HAVING count(*) > 1
        ) k ON k.value = p.value
       WHERE p.id <> k.keep_id
    `);

    await queryRunner.query(`
      UPDATE postcode keep
         SET latitude = dupe.latitude, longitude = dupe.longitude
        FROM (
          SELECT DISTINCT ON (d.keep_id) d.keep_id, p.latitude, p.longitude
            FROM postcode_dupe d
            JOIN postcode p ON p.id = d.dupe_id
           WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
           ORDER BY d.keep_id, p.id
        ) dupe
       WHERE keep.id = dupe.keep_id
         AND (keep.latitude IS NULL OR keep.longitude IS NULL)
    `);

    for (const table of ["address", "deal", "accompanying"]) {
      await queryRunner.query(`
        UPDATE "${table}" t
           SET postcode_id = d.keep_id
          FROM postcode_dupe d
         WHERE t.postcode_id = d.dupe_id
      `);
    }

    for (const [table, ownerColumn] of [
      ["district_postcode", "district_id"],
      ["agent_postcode", "agent_id"],
    ]) {
      await queryRunner.query(`
        UPDATE "${table}" t
           SET postcode_id = d.keep_id
          FROM postcode_dupe d
         WHERE t.postcode_id = d.dupe_id
      `);
      await queryRunner.query(`
        DELETE FROM "${table}" t
         USING "${table}" other
         WHERE t.${ownerColumn} = other.${ownerColumn}
           AND t.postcode_id = other.postcode_id
           AND t.id > other.id
           AND t.postcode_id IN (SELECT keep_id FROM postcode_dupe)
      `);
    }

    await queryRunner.query(`
      DELETE FROM postcode_commute
       WHERE from_postcode_id IN (SELECT dupe_id FROM postcode_dupe)
          OR to_postcode_id IN (SELECT dupe_id FROM postcode_dupe)
    `);

    await queryRunner.query(`
      DELETE FROM postcode WHERE id IN (SELECT dupe_id FROM postcode_dupe)
    `);
  }

  public async down(): Promise<void> {}
}
